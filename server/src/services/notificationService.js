import { AuditLog, Notification } from '../models/index.js';
import { logger } from '../utils/logger.js';

export async function logAudit({ user, action, module, entityId, entityRef, description, req, meta }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip) : undefined;
    const userAgent = req ? req.headers['user-agent'] : undefined;

    await AuditLog.create({
      user: user?._id || user?.id,
      userName: user?.name || 'System',
      action,
      module,
      entityId,
      entityRef,
      description,
      ip,
      userAgent,
      meta,
    });
  } catch (err) {
    logger.error('Failed to write audit log:', err.message);
  }
}

export async function createNotification({ user, audience, type, severity = 'info', title, message, link, dedupeKey }) {
  try {
    if (dedupeKey) {
      const existing = await Notification.findOne({ dedupeKey, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (existing) return existing;
    }

    return await Notification.create({
      user,
      audience,
      type,
      severity,
      title,
      message,
      link,
      dedupeKey,
      readBy: [],
    });
  } catch (err) {
    logger.error('Failed to create notification:', err.message);
  }
}
