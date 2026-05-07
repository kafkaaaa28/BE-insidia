import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import type {
  JwtPayload as JsonWebTokenPayload,
  SignOptions,
} from 'jsonwebtoken';

export type AccessTokenPayload = {
  type: 'access';
  sub: string;
  email: string;
  role: string;
  status: string;
  sessionId: string;
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  type: 'refresh';
  sub: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
};

type JwtPayload = AccessTokenPayload | RefreshTokenPayload;

@Injectable()
export class JwtTokenService {
  signAccessToken(
    payload: Omit<AccessTokenPayload, 'type' | 'iat' | 'exp'>,
    expiresInSeconds: number,
  ) {
    return this.sign({ ...payload, type: 'access' }, expiresInSeconds);
  }

  signRefreshToken(
    payload: Omit<RefreshTokenPayload, 'type' | 'iat' | 'exp'>,
    expiresInSeconds: number,
  ) {
    return this.sign({ ...payload, type: 'refresh' }, expiresInSeconds);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Tipe token tidak valid');
    }

    return payload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Tipe token tidak valid');
    }

    return payload;
  }

  private sign(payload: JwtPayload, expiresInSeconds: number) {
    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: expiresInSeconds,
    };

    return sign(payload, this.secret(), options);
  }

  private verify(token: string): JwtPayload {
    try {
      const payload = verify(token, this.secret(), {
        algorithms: ['HS256'],
      });

      if (!payload || typeof payload === 'string') {
        throw new UnauthorizedException('Token tidak valid');
      }

      return this.assertPayload(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token tidak valid');
    }
  }

  private assertPayload(payload: JsonWebTokenPayload): JwtPayload {
    if (payload.type === 'access') {
      return {
        type: 'access',
        sub: assertString(payload.sub),
        email: assertString(payload.email),
        role: assertString(payload.role),
        status: assertString(payload.status),
        sessionId: assertString(payload.sessionId),
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    if (payload.type === 'refresh') {
      return {
        type: 'refresh',
        sub: assertString(payload.sub),
        sessionId: assertString(payload.sessionId),
        tokenVersion: assertNumber(payload.tokenVersion),
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    throw new UnauthorizedException('Token tidak valid');
  }

  private secret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET belum dikonfigurasi');
    }

    return secret;
  }
}

function assertString(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new UnauthorizedException('Token tidak valid');
  }

  return value;
}

function assertNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UnauthorizedException('Token tidak valid');
  }

  return value;
}
