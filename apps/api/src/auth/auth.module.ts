import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ConsoleMailer, MAILER } from './mailer';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, { provide: MAILER, useClass: ConsoleMailer }],
  exports: [AuthService, AuthGuard, MAILER],
})
export class AuthModule {}
