import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type AuthUser } from './auth.service';
import { readCookie, SESSION_COOKIE } from './session';

export type { AuthUser };
const ROLES = 'roles';
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata(ROLES, roles);

/** Exige sessão válida (cookie pj_session); opcionalmente um papel (ex.: moderator). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = await this.auth.userForSession(readCookie(req, SESSION_COOKIE));
    if (!user) throw new UnauthorizedException('Inicia sessão para continuar');
    req.user = user;
    const roles = this.reflector.getAllAndOverride<AuthUser['role'][]>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Sem permissão');
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser);
