import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtTokenService } from '../../auth/jwt-token.service';
import { AdminAccessGuard } from '../../guards/admin-access.guard';
import { UserRepository } from './user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, JwtTokenService, AdminAccessGuard],
})
export class UserModule {}
