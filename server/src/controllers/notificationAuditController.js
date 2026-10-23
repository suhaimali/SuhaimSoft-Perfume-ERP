import { Notification, AuditLog } from '../models/index.js';
import { asyncHandler } from '../utils/ApiError.js';
import { parsePagination, paged } from '../utils/helpers.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const query = {
    $or: [
      { user: req.user?._id },
      { audience: { $in: Array.from(req.permissions || []) } },
      ...(req.user?.isMasterAdmin ? [{ user: null }] : []),
    ],
  };

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30);
  res.json({ success: true, data: { notifications } });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: req.user?._id } });
  res.json({ success: true, message: 'Notification marked as read' });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({}, { $addToSet: { readBy: req.user?._id } });
  res.json({ success: true, message: 'All notifications marked as read' });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.user) filter.user = req.query.user;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email'),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: paged(logs, total, { page, limit }) });
});
