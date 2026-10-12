import { Body, Controller, Get, HttpCode, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CreateOrganizationInput, SearchOrganizationsQuery } from '@peekjob/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { privacySecret, userRef } from '../common/privacy';
import { parse } from '../common/zod';
import { MergedOrgRedirect, OrganizationsService } from './organizations.service';

const MergeBody = z.object({ targetId: z.string().uuid() });

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  async list() {
    return { items: await this.orgs.listActive() };
  }

  @Get('search')
  async search(@Query() query: unknown) {
    return { items: await this.orgs.search(parse(SearchOrganizationsQuery, query)) };
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.orgs.create(parse(CreateOrganizationInput, body), userRef(privacySecret(), user.id));
  }

  @Get(':id')
  async get(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    try {
      return await this.orgs.getPublic(id);
    } catch (e) {
      if (e instanceof MergedOrgRedirect) {
        res.status(308).location(`/orgs/${e.targetId}`);
        return { mergedInto: e.targetId };
      }
      throw e;
    }
  }

  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('moderator')
  approve(@Param('id') id: string) {
    return this.orgs.approve(id);
  }

  @Post(':id/merge')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('moderator')
  merge(@Param('id') id: string, @Body() body: unknown) {
    return this.orgs.merge(id, parse(MergeBody, body).targetId);
  }
}
