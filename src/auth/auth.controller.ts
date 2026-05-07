import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/zod/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  googleExchangeSchema,
  refreshTokenSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './dto/create-auth.dto';
import type {
  GoogleExchangeDto,
  RefreshTokenDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto/create-auth.dto';
import { AccessTokenGuard } from '../guards/access-token.guard';
import type { AuthenticatedRequest } from '../guards/access-token.guard';
import { InternalTokenGuard } from '../guards/internal-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) dto: RequestOtpDto,
    @Req() request: Request,
  ) {
    console.log('Request OTP login attempt for email:', dto.email);
    return this.authService.requestOtpLogin(dto.email, getIpAddress(request));
  }

  @Post('verify-otp')
  verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) dto: VerifyOtpDto,
    @Req() request: Request,
  ) {
    return this.authService.verifyOtpLogin(
      dto.token,
      dto.otp,
      getIpAddress(request),
      request.headers['user-agent'],
    );
  }

  @UseGuards(InternalTokenGuard)
  @Post('google/exchange')
  googleExchange(
    @Body(new ZodValidationPipe(googleExchangeSchema)) dto: GoogleExchangeDto,
    @Req() request: Request,
  ) {
    return this.authService.loginWithGoogle(
      dto,
      getIpAddress(request),
      request.headers['user-agent'],
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.logoutCurrent(request.auth.sessionId);
    return { message: 'Logout berhasil' };
  }
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] ?? 'unknown';
  }

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}
