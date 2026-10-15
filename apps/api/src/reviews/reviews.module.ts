import { Module } from '@nestjs/common';
import { MyReviewsController } from '../me/reviews.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({ controllers: [ReviewsController, MyReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
