import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from '../schemas/outbox-event.schema.js';
import { OutboxStatus } from '@sports/shared';

export interface PublishOutboxEventDto {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
  ) {}

  /**
   * Lưu sự kiện vào outbox_events. Luôn truyền `session` khi gọi bên trong Transaction
   * để đảm bảo tính nhất quán (Atomicity) theo Outbox Pattern.
   */
  async recordEvent(dto: PublishOutboxEventDto, session?: ClientSession): Promise<OutboxEventDocument> {
    const event = new this.outboxModel({
      ...dto,
      status: OutboxStatus.PENDING,
      retryCount: 0,
    });

    const saved = await event.save({ session });
    this.logger.debug(
      `Recorded outbox event: ${dto.eventType} for ${dto.aggregateType} [${dto.aggregateId}]`,
    );
    return saved;
  }
}
