import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { ClaimsService } from './claims.service';
import { DashboardService } from './dashboard.service';
import { RepliesService } from './replies.service';

@Module({ controllers: [AccountsController], providers: [ClaimsService, RepliesService, DashboardService] })
export class AccountsModule {}
