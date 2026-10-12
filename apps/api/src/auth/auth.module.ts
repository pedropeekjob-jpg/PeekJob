import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MAILER } from './mailer';
import { createMailer } from './resend-mailer';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, { provide: MAILER, useFactory: () => createMailer(process.env) }],
  exports: [AuthService, AuthGuard, MAILER],
})
export class AuthModule {}
