import { Module } from '@nestjs/common';
import { AppealsModule } from './appeals/appeals.module';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health.controller';
import { HelpfulController } from './engagement/helpful.controller';
import { SavedController } from './engagement/saved.controller';
import { MessagesController } from './me/messages.controller';
import { AccountController } from './me/account.controller';
import { MyReviewsController } from './me/reviews.controller';
import { ModerationController } from './moderation/moderation.controller';
import { ReportsModule } from './reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ContributionsModule } from './contributions/contributions.module';
import { RewriteModule } from './rewrite/rewrite.module';
import { VerificationModule } from './verification/verification.module';
import { SeoController } from './web/seo.controller';
import { SecurityModule } from './security/security.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [SecurityModule, MonitoringModule, DbModule, AuthModule, OrganizationsModule, ReviewsModule, VerificationModule, ReportsModule, AppealsModule, RewriteModule, ContributionsModule],
  controllers: [HealthController, MessagesController, MyReviewsController, AccountController, SavedController, HelpfulController, ModerationController, SeoController],
})
export class AppModule {}
