import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

export async function connectDB(uriOverride) {
  let uri = uriOverride || config.mongoUri;

  if (!uri && config.useMemoryDb) {
    // Transactions require a replica set; MongoMemoryReplSet gives us one locally.
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    uri = memoryServer.getUri('suhaimsoft_perfume');
    logger.warn('MONGODB_URI not set — using an in-memory MongoDB replica set (data is NOT persisted).');
  }

  if (!uri) throw new Error('MONGODB_URI is required');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true, serverSelectionTimeoutMS: 15000 });
  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isMemoryDb() {
  return !!memoryServer;
}
