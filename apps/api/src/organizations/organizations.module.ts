import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { createVies, VIES } from './vies';
import { createGeocoder, GEOCODER } from '../geocoding/geocoder';
import { GeocodingService } from '../geocoding/geocoding.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, GeocodingService, { provide: VIES, useFactory: () => createVies(process.env) }, { provide: GEOCODER, useFactory: () => createGeocoder(process.env) }],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
