import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { AppealsService } from './appeals.service';

const AppealBody = z.object({ text: z.string().trim().min(10).max(2000) });
const AppealDecisionBody = z.object({ action: z.enum(['reverse', 'confirm']), note: z.string().trim().min(10).max(1000) });

@Controller()
@UseGuards(AuthGuard)
export class AppealsController {
  constructor(private readonly appeals: AppealsService) {}

  @Post('me/messages/:id/appeal')
  @HttpCode(201)
  create(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.appeals.create(id, userRef(privacySecret(), user.id), parse(AppealBody, body).text);
  }

  @Get('moderation/appeals')
  @Roles('moderator')
  queue() {
    return this.appeals.queue();
  }

  @Post('moderation/appeals/:id/decision')
  @HttpCode(200)
  @Roles('moderator')
  decide(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const b = parse(AppealDecisionBody, body);
    return this.appeals.decide(id, b.action, b.note, user.id);
  }
}
