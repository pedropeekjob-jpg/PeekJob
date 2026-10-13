import { Global, Module } from '@nestjs/common';
import { ClientErrorsController } from './client-errors.controller';
import { createReporter, REPORTER } from './reporter';

@Global()
@Module({
  controllers: [ClientErrorsController],
  providers: [{ provide: REPORTER, useFactory: () => createReporter(process.env) }],
  exports: [REPORTER],
})
export class MonitoringModule {}
