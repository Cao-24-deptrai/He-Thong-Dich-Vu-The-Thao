// Môi trường test thật: MongoDB REPLICA SET + Redis thật. KHÔNG mock transaction hay unique index.
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import mongoose from 'mongoose';
import Redis from 'ioredis';

let repl: MongoMemoryReplSet;
let redisContainer: StartedTestContainer;
export let redis: Redis;

export async function startTestEnv() {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  await mongoose.syncIndexes(); // BẮT BUỘC: unique index là một phần của bài test
  redisContainer = await new GenericContainer('redis:7').withExposedPorts(6379).start();
  redis = new Redis(redisContainer.getMappedPort(6379), redisContainer.getHost());
}

export async function resetTestEnv() {
  await redis.flushall();
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopTestEnv() {
  await mongoose.disconnect();
  await repl.stop();
  redis.disconnect();
  await redisContainer.stop();
}
