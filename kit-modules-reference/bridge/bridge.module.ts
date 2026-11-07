import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BridgeAgent,
  BridgeAgentSchema,
  DeviceCommand,
  DeviceCommandSchema,
  DeviceEvent,
  DeviceEventSchema,
} from './schemas/index.js';
import {
  GymMembership,
  GymMembershipSchema,
} from '../gym/schemas/gym-membership.schema.js';
import { User, UserSchema } from '../auth/schemas/user.schema.js';
import { BridgeAgentService } from './services/bridge-agent.service.js';
import { DeviceCommandService } from './services/device-command.service.js';
import { DeviceEventService } from './services/device-event.service.js';
import { OfflineSyncService } from './services/offline-sync.service.js';
import { BridgeAgentPublicController } from './controllers/bridge-agent-public.controller.js';
import { AdminBridgeController } from './controllers/admin-bridge.controller.js';
import { GymModule } from '../gym/gym.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BridgeAgent.name, schema: BridgeAgentSchema },
      { name: DeviceCommand.name, schema: DeviceCommandSchema },
      { name: DeviceEvent.name, schema: DeviceEventSchema },
      { name: GymMembership.name, schema: GymMembershipSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => GymModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [BridgeAgentPublicController, AdminBridgeController],
  providers: [
    BridgeAgentService,
    DeviceCommandService,
    DeviceEventService,
    OfflineSyncService,
  ],
  exports: [
    BridgeAgentService,
    DeviceCommandService,
    DeviceEventService,
    OfflineSyncService,
  ],
})
export class BridgeModule {}
