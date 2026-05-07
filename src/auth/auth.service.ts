import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginEventProvider, UserStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuthRepository } from './auth.repository';
import type { OAuthAccountInput, PublicUser } from './auth.repository';
import type { GoogleExchangeDto } from './dto/create-auth.dto';
import { JwtTokenService } from './jwt-token.service';
import { OtpService } from '../otp/otp.service';
import { console } from 'inspector';

type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
};

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = numberFromEnv(
    'JWT_ACCESS_TOKEN_TTL_SECONDS',
    60 * 30,
  );
  private readonly refreshTokenTtlSeconds = numberFromEnv(
    'JWT_REFRESH_TOKEN_TTL_SECONDS',
    60 * 60 * 24 * 3,
  );

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly otpService: OtpService,
  ) {}

  async requestOtpLogin(email: string, ipAddress: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user =
      await this.authRepository.findUserByNormalizedEmail(normalizedEmail);

    if (user && user.status === 'BANNED') {
      return;
    }

    const otp = await this.otpService.sendOtp({
      recipient: normalizedEmail,
      purpose: 'login',
      ipAddress,
    });

    const response: {
      token: string;
      expiresInSeconds: number;
      devOtp?: string;
    } = {
      token: otp.token,
      expiresInSeconds: otp.expiresInSeconds,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.devOtp = otp.devOtp;
    }
    console.log(response);
    return response;
  }

  async verifyOtpLogin(
    token: string,
    otp: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    let userId: string | null = null;
    let email: string | null = null;
    try {
      const verifiedOtp = await this.otpService.verifyOtp({
        token,
        purpose: 'login',
        otp,
        ipAddress,
      });
      email = verifiedOtp.recipient;
      let user = await this.authRepository.findUserByNormalizedEmail(email);
      if (user) {
        userId = user.id;
        user = await this.ensureActiveUser(user);
        await this.authRepository.restoreUserByEmail(email);
      } else {
        user = await this.authRepository.createEmailUser(email);
        userId = user.id;
      }

      const session = await this.issueSession(user, ipAddress, userAgent);
      await this.recordLoginEvent({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        success: true,
        reason: 'LOGIN_SUCCESS',
        provider: LoginEventProvider.EMAIL,
      });

      return session;
    } catch (error) {
      await this.recordLoginEvent({
        userId,
        email: email ?? 'unknown',
        ipAddress,
        userAgent,
        success: false,
        reason: reasonFromError(error),
        provider: LoginEventProvider.EMAIL,
      });

      throw error;
    }
  }

  async loginWithGoogle(
    input: GoogleExchangeDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    let userId: string | null = null;

    try {
      let user = await this.authRepository.findUserByNormalizedEmail(
        input.email,
      );

      if (!user) {
        user = await this.authRepository.createGoogleUser({
          normalizedEmail: input.email,
          name: input.name,
          image: input.image,
          emailVerified: input.emailVerified,
        });
      }

      userId = user.id;
      await this.ensureActiveUser(user);

      user = await this.syncGoogleProfile(user, input);
      const account: OAuthAccountInput = input.account;
      await this.authRepository.upsertOAuthAccount(user.id, account);

      const session = await this.issueSession(user, ipAddress, userAgent);

      await this.recordLoginEvent({
        userId: user.id,
        email: input.email,
        ipAddress,
        userAgent,
        success: true,
        reason: 'LOGIN_SUCCESS',
        provider: LoginEventProvider.GOOGLE,
      });

      return session;
    } catch (error) {
      await this.recordLoginEvent({
        userId,
        email: input.email,
        ipAddress,
        userAgent,
        success: false,
        reason: reasonFromError(error),
        provider: LoginEventProvider.GOOGLE,
      });

      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.jwtTokenService.verifyRefreshToken(refreshToken);
    const session = await this.authRepository.findSessionById(
      payload.sessionId,
    );

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Sesi tidak ditemukan');
    }

    if (session.expiresAt < new Date()) {
      await this.authRepository.deleteSession(payload.sessionId);
      throw new UnauthorizedException('Sesi sudah kedaluwarsa');
    }

    if (
      session.refreshTokenHash !== sha256(refreshToken) ||
      session.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = await this.authRepository.findUserById(session.userId);

    if (!user) {
      await this.authRepository.deleteSession(payload.sessionId);
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.ensureActiveUser(user);

    return {
      user,
      accessToken: this.jwtTokenService.signAccessToken(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          sessionId: payload.sessionId,
        },
        this.accessTokenTtlSeconds,
      ),
      refreshToken,
      accessTokenExpiresInSeconds: this.accessTokenTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTokenTtlSeconds,
    };
  }

  verifyAccessToken(token: string) {
    return this.jwtTokenService.verifyAccessToken(token);
  }

  async logoutCurrent(sessionId: string): Promise<void> {
    await this.authRepository.deleteSession(sessionId);
  }

  private async syncGoogleProfile(user: PublicUser, input: GoogleExchangeDto) {
    const dataToUpdate: {
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    } = {};

    if (!user.name && input.name) {
      dataToUpdate.name = input.name;
    }

    if (!user.image && input.image) {
      dataToUpdate.image = input.image;
    }

    if (!user.emailVerified && input.emailVerified) {
      dataToUpdate.emailVerified = input.emailVerified;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return user;
    }

    return this.authRepository.updateGoogleUser(user.id, dataToUpdate);
  }

  private async issueSession(
    user: PublicUser,
    ipAddress: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const sessionId = randomUUID();
    const tokenVersion = 1;
    const refreshToken = this.jwtTokenService.signRefreshToken(
      {
        sub: user.id,
        sessionId,
        tokenVersion,
      },
      this.refreshTokenTtlSeconds,
    );

    const accessToken = this.jwtTokenService.signAccessToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        sessionId,
      },
      this.accessTokenTtlSeconds,
    );

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      tokenVersion,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
    });

    return {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: this.accessTokenTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTokenTtlSeconds,
    };
  }

  private async ensureActiveUser(user: PublicUser | null): Promise<PublicUser> {
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Akun tidak tersedia');
    }

    return user;
  }

  private async recordLoginEvent(params: {
    userId: string | null;
    email: string;
    provider: LoginEventProvider;
    success: boolean;
    reason: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    try {
      await this.authRepository.createLoginEvent(params);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Gagal menyimpan login event', error);
      }
    }
  }
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function reasonFromError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'LOGIN_FAILED_INTERNAL_ERROR';
}

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  const numberValue = value ? Number(value) : NaN;

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}
