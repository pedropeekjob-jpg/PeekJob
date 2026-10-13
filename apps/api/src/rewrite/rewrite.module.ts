import { Module } from '@nestjs/common';
import { RewriteController } from './rewrite.controller';
import { createRewriter, REWRITER } from './rewriter';

@Module({
  controllers: [RewriteController],
  providers: [{ provide: REWRITER, useFactory: () => createRewriter(process.env) }],
})
export class RewriteModule {}
