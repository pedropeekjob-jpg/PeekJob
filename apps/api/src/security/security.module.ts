import { Global, Module } from '@nestjs/common';
import { RateLimiter, rateLimitScale } from './rate-limit';

@Global()
@Module({ providers: [{ provide: RateLimiter, useFactory: () => new RateLimiter(rateLimitScale(process.env)) }], exports: [RateLimiter] })
export class SecurityModule {}
