import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { seedDatabase } from './scripts/seed.js';
import { User } from './models/index.js';

let server;

async function bootstrap() {
  try {
    await connectDB();

    // Auto-seed if database has no users yet or autoSeedDemo is on
    const userCount = await User.countDocuments();
    if (userCount === 0 || config.autoSeedDemo) {
      logger.info('Initializing default data and admin account...');
      await seedDatabase();
    }

    server = http.createServer(app);
    server.listen(config.port, () => {
      logger.info(`SuhaimSoft Perfume ERP API running on http://localhost:${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/`);
      logger.info(`Master Admin: ${config.admin.email} / ${config.admin.password}`);
    });
  } catch (err) {
    logger.error('Fatal startup error:', err);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down server gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();
