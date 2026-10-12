import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { MessagesController } from './me/messages.controller';
import { MyReviewsController } from './me/reviews.controller';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [DbModule, AuthModule, OrganizationsModule, ReviewsModule, VerificationModule],
  controllers: [HealthController, MessagesController, MyReviewsController],
})
export class AppModule {}
