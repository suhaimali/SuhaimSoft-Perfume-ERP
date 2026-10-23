import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const isProd = env === 'production';

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  // In development, if no MONGODB_URI is set, an in-memory replica set is started.
  useMemoryDb: !process.env.MONGODB_URI && !isProd,
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', isProd ? undefined : 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', isProd ? undefined : 'dev-refresh-secret-change-me'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7),
  },
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  admin: {
    name: process.env.ADMIN_NAME || 'Suhaim Ali VP',
    email: (process.env.ADMIN_EMAIL || 'admin@suhaimsoft.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  autoSeedDemo: process.env.SEED_DEMO_DATA === 'true',
};
