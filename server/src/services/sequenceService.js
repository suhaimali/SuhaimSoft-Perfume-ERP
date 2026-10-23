import { Counter, BusinessSetting } from '../models/index.js';

export async function getNextSequence(prefixKey, defaultPrefix) {
  const settings = await BusinessSetting.findOne({ key: 'default' });
  const prefix = settings?.invoice?.[prefixKey] || defaultPrefix;
  const padding = settings?.invoice?.padding || 5;

  const counter = await Counter.findByIdAndUpdate(
    prefixKey,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}${String(counter.seq).padStart(padding, '0')}`;
}
