import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchRequest, MatchRequestSchema } from './schemas/match-request.schema';
import { MatchRequestsService } from './match-requests.service';
import { MatchRequestsController } from './match-requests.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MatchRequest.name, schema: MatchRequestSchema }]),
    EventsModule,
  ],
  controllers: [MatchRequestsController],
  providers: [MatchRequestsService],
  exports: [MatchRequestsService, MongooseModule],
})
export class MatchRequestsModule {}
