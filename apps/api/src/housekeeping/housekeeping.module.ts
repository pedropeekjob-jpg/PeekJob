import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';

/** Tarefas de manutenção em segundo plano */
@Module({ providers: [CleanupService] })
export class HousekeepingModule {}
