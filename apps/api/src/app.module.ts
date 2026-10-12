import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { MessagesController } from './me/messages.controller';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [DbModule, OrganizationsModule, ReviewsModule],
  controllers: [HealthController, MessagesController],
})
export class AppModule {}
