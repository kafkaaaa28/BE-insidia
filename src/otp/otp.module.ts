import { Module } from '@nestjs/common';
import { RateLimitModule } from '../common/rate-limit/rate-limit.module';
import { RedisModule } from '../redis/redis.module';
import { OtpService } from './otp.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [RedisModule, RateLimitModule, EmailModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
