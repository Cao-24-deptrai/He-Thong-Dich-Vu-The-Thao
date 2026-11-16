import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.boolean(),
    redis: z.boolean(),
  }),
});

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
