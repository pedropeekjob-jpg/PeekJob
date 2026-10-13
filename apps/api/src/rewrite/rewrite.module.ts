import { Module } from '@nestjs/common';
import { RewriteController, RewriteLimiter } from './rewrite.controller';
import { createRewriter, REWRITER } from './rewriter';

@Module({
  controllers: [RewriteController],
  providers: [RewriteLimiter, { provide: REWRITER, useFactory: () => createRewriter(process.env) }],
})
export class RewriteModule {}
