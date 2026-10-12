import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateReviewInput } from '@peekjob/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { ReviewsService } from './reviews.service';

@Controller('orgs/:orgId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Param('orgId') orgId: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.reviews.create(orgId, parse(CreateReviewInput, body), userRef(privacySecret(), user.id));
  }

  @Get()
  async list(@Param('orgId') orgId: string) {
    return { items: await this.reviews.listPublic(orgId) };
  }
}
