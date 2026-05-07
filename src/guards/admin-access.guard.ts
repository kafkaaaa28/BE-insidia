import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtTokenService } from '../auth/jwt-token.service';
import type { AuthenticatedRequest } from './access-token.guard';
import { getBearerToken } from './access-token.guard';

const adminRoles = new Set(['ADMIN', 'ADMIN_MENTOR', 'ADMIN_AKADEMIK']);

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(request as Request);

    if (!token) {
      throw new UnauthorizedException('Access token wajib dikirim');
    }

    const auth = this.jwtTokenService.verifyAccessToken(token);

    if (!adminRoles.has(auth.role)) {
      throw new ForbiddenException('Akses admin diperlukan');
    }

    request.auth = auth;

    return true;
  }
}

@Injectable()
export class SuperAdminAccessGuard implements CanActivate {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(request as Request);

    if (!token) {
      throw new UnauthorizedException('Access token wajib dikirim');
    }
    const auth = this.jwtTokenService.verifyAccessToken(token);

    if (auth.role !== 'ADMIN') {
      throw new ForbiddenException('Akses super admin diperlukan');
    }

    request.auth = auth;

    return true;
  }
}
