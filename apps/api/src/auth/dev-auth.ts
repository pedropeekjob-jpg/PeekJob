import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

/**
 * AUTENTICAÇÃO PROVISÓRIA (desenvolvimento e testes).
 * Lê o utilizador dos cabeçalhos x-user-id / x-user-role.
 * Na próxima fatia é substituída por link mágico por email + sessão (cookie httpOnly).
 * Nunca ativar em produção: ver ALLOW_DEV_AUTH.
 */
export interface AuthUser {
  id: string;
  role: 'user' | 'moderator';
}

const ROLES = 'roles';
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata(ROLES, roles);

function readUser(req: Request): AuthUser | null {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AUTH !== 'true') return null;
  const id = req.header('x-user-id');
  if (!id) return null;
  return { id, role: req.header('x-user-role') === 'moderator' ? 'moderator' : 'user' };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = readUser(req);
    if (!user) throw new UnauthorizedException('Inicia sessão para continuar');
    req.user = user;
    const roles = this.reflector.getAllAndOverride<AuthUser['role'][]>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Sem permissão');
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser);
