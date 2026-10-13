import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { createVies, VIES } from './vies';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, { provide: VIES, useFactory: () => createVies(process.env) }],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
