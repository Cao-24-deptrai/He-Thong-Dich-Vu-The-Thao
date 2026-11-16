import { z } from 'zod';
import {
  BridgeAgentStatus,
  DeviceType,
  DeviceHealthStatus,
  DeviceCommandType,
  DeviceCommandStatus,
  DeviceEventType,
} from '@sports/shared';

// 1. Device Diagnostics Sub-schema
export const deviceDiagnosticItemSchema = z.object({
  status: z.nativeEnum(DeviceHealthStatus),
  details: z.string().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type DeviceDiagnosticItem = z.infer<typeof deviceDiagnosticItemSchema>;

// 2. Agent Management Schemas
export const createBridgeAgentSchema = z.object({
  agentCode: z.string().min(3).max(32).trim(),
  name: z.string().min(2).max(100).trim(),
  location: z.string().min(2).max(100).trim(),
  supportedDevices: z.array(z.nativeEnum(DeviceType)).min(1),
  config: z
    .object({
      printerIp: z.string().optional(),
      printerPort: z.number().int().optional(),
      printerBaudRate: z.number().int().optional(),
      turnstileRelayPin: z.number().int().optional(),
      turnstilePulseDurationMs: z.number().int().min(500).max(10000).default(3000),
      cashDrawerKickPulseMs: z.number().int().min(50).max(500).default(100),
      courtLightRelayChannel: z.number().int().optional(),
    })
    .default({}),
});
export type CreateBridgeAgentDto = z.input<typeof createBridgeAgentSchema>;

export const bridgeAgentDetailSchema = z.object({
  id: z.string(),
  agentCode: z.string(),
  name: z.string(),
  location: z.string(),
  status: z.nativeEnum(BridgeAgentStatus),
  ipAddress: z.string().optional(),
  version: z.string().optional(),
  supportedDevices: z.array(z.nativeEnum(DeviceType)),
  deviceStatuses: z.record(z.string(), deviceDiagnosticItemSchema).default({}),
  config: z.record(z.string(), z.any()).default({}),
  lastHeartbeatAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});
export type BridgeAgentDetailResponse = z.infer<typeof bridgeAgentDetailSchema>;

export const registerAgentResponseSchema = z.object({
  agent: bridgeAgentDetailSchema,
  secretKey: z.string(), // Trả về 1 lần duy nhất khi tạo
});
export type RegisterAgentResponse = z.infer<typeof registerAgentResponseSchema>;

// 3. Handshake & Authentication
export const agentHandshakeSchema = z.object({
  agentCode: z.string().trim(),
  secretKey: z.string().trim(),
  version: z.string().trim(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
});
export type AgentHandshakeDto = z.input<typeof agentHandshakeSchema>;

export const agentHandshakeResponseSchema = z.object({
  agentId: z.string(),
  agentCode: z.string(),
  sessionToken: z.string(),
  expiresInSeconds: z.number().int(),
  serverTime: z.coerce.date(),
  config: z.record(z.string(), z.any()),
});
export type AgentHandshakeResponse = z.infer<typeof agentHandshakeResponseSchema>;

// 4. Heartbeat
export const agentHeartbeatSchema = z.object({
  agentCode: z.string().trim(),
  deviceStatuses: z.record(z.string(), deviceDiagnosticItemSchema).default({}),
  version: z.string().optional(),
  offlineQueueLength: z.number().int().nonnegative().default(0),
});
export type AgentHeartbeatDto = z.input<typeof agentHeartbeatSchema>;

export const agentHeartbeatResponseSchema = z.object({
  acknowledged: z.boolean(),
  hasPendingCommands: z.boolean(),
  serverTime: z.coerce.date(),
});
export type AgentHeartbeatResponse = z.infer<typeof agentHeartbeatResponseSchema>;

// 5. Device Command Schemas
export const dispatchDeviceCommandSchema = z.object({
  agentId: z.string().trim(),
  commandType: z.nativeEnum(DeviceCommandType),
  payload: z.record(z.string(), z.any()).default({}),
  priority: z.number().int().min(1).max(10).default(1),
  idempotencyKey: z.string().min(5).max(128).trim(),
});
export type DispatchDeviceCommandDto = z.input<typeof dispatchDeviceCommandSchema>;

export const deviceCommandDetailSchema = z.object({
  id: z.string(),
  commandCode: z.string(),
  agentId: z.string(),
  commandType: z.nativeEnum(DeviceCommandType),
  payload: z.record(z.string(), z.any()),
  status: z.nativeEnum(DeviceCommandStatus),
  priority: z.number().int(),
  idempotencyKey: z.string(),
  executedAt: z.coerce.date().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.coerce.date(),
});
export type DeviceCommandDetailResponse = z.infer<typeof deviceCommandDetailSchema>;

export const completeDeviceCommandSchema = z.object({
  status: z.enum([DeviceCommandStatus.EXECUTED, DeviceCommandStatus.FAILED]),
  result: z.any().optional(),
  errorMessage: z.string().optional(),
});
export type CompleteDeviceCommandDto = z.input<typeof completeDeviceCommandSchema>;

// 6. Device Event Ingestion & Offline Sync
export const deviceEventItemSchema = z.object({
  eventCode: z.string().trim(),
  eventType: z.nativeEnum(DeviceEventType),
  deviceType: z.nativeEnum(DeviceType),
  payload: z.record(z.string(), z.any()).default({}),
  occurredAt: z.coerce.date(),
  idempotencyKey: z.string().min(5).max(128).trim(),
  isOfflineReplay: z.boolean().default(false),
});
export type DeviceEventItemDto = z.input<typeof deviceEventItemSchema>;

export const ingestDeviceEventsSchema = z.object({
  events: z.array(deviceEventItemSchema).min(1).max(100),
});
export type IngestDeviceEventsDto = z.input<typeof ingestDeviceEventsSchema>;

export const ingestDeviceEventsResponseSchema = z.object({
  receivedCount: z.number().int(),
  processedCount: z.number().int(),
  actionResults: z.array(
    z.object({
      eventCode: z.string(),
      success: z.boolean(),
      message: z.string().optional(),
      triggeredTurnstile: z.boolean().default(false),
    }),
  ),
});
export type IngestDeviceEventsResponse = z.infer<typeof ingestDeviceEventsResponseSchema>;

// 7. Offline Resilience Member Snapshot Cache
export const offlineMemberItemSchema = z.object({
  memberId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  rfidCardNumberHash: z.string().optional(),
  qrIdentifierHash: z.string().optional(),
  validUntil: z.coerce.date(),
  membershipType: z.string(),
  signature: z.string(), // Server HMAC-SHA256 signature
});
export type OfflineMemberItem = z.infer<typeof offlineMemberItemSchema>;

export const offlineMemberSyncResponseSchema = z.object({
  snapshotTime: z.coerce.date(),
  totalMembers: z.number().int(),
  members: z.array(offlineMemberItemSchema),
});
export type OfflineMemberSyncResponse = z.infer<typeof offlineMemberSyncResponseSchema>;
