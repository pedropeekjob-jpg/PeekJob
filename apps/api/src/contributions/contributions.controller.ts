import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateInterviewInput, CreateSalaryInput } from '@peekjob/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { ContributionsService } from './contributions.service';

@Controller('orgs/:orgId')
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post('interviews')
  @UseGuards(AuthGuard)
  createInterview(@Param('orgId') orgId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.contributions.createInterview(orgId, parse(CreateInterviewInput, body), userRef(privacySecret(), user.id));
  }

  @Get('interviews')
  listInterviews(@Param('orgId') orgId: string) {
    return this.contributions.listInterviews(orgId);
  }

  @Post('salaries')
  @UseGuards(AuthGuard)
  saveSalary(@Param('orgId') orgId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.contributions.saveSalary(orgId, parse(CreateSalaryInput, body), userRef(privacySecret(), user.id));
  }

  @Get('salaries')
  salaries(@Param('orgId') orgId: string) {
    return this.contributions.salaries(orgId);
  }
}
