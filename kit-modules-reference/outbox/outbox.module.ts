import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema.js';
import { OutboxService } from './services/outbox.service.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
