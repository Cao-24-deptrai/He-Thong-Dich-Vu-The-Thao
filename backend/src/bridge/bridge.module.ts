import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BridgeAgent, BridgeAgentSchema } from './schemas/bridge-agent.schema';
import { DeviceCommand, DeviceCommandSchema } from './schemas/device-command.schema';
import { DeviceEvent, DeviceEventSchema } from './schemas/device-event.schema';
import { BridgeAgentService } from './bridge-agent.service';
import { DeviceCommandService } from './device-command.service';
import { OfflineSyncService } from './offline-sync.service';
import { BridgeController } from './bridge.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BridgeAgent.name, schema: BridgeAgentSchema },
      { name: DeviceCommand.name, schema: DeviceCommandSchema },
      { name: DeviceEvent.name, schema: DeviceEventSchema },
    ]),
  ],
  controllers: [BridgeController],
  providers: [
    BridgeAgentService,
    DeviceCommandService,
    OfflineSyncService,
  ],
  exports: [
    BridgeAgentService,
    DeviceCommandService,
    OfflineSyncService,
  ],
})
export class BridgeModule {}
