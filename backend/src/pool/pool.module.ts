import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolTicket, PoolTicketSchema } from './schemas/pool-ticket.schema';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PoolTicket.name, schema: PoolTicketSchema },
    ]),
    EventsModule,
  ],
  controllers: [PoolController],
  providers: [PoolService],
  exports: [PoolService],
})
export class PoolModule {}
