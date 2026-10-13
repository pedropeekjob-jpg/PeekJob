import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { MessagesController } from './me/messages.controller';
import { AccountController } from './me/account.controller';
import { MyReviewsController } from './me/reviews.controller';
import { ReportsModule } from './reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { VerificationModule } from './verification/verification.module';
import { SeoController } from './web/seo.controller';

@Module({
  imports: [DbModule, AuthModule, OrganizationsModule, ReviewsModule, VerificationModule, ReportsModule],
  controllers: [HealthController, MessagesController, MyReviewsController, AccountController, SeoController],
})
export class AppModule {}
