const ts = () => new Date().toISOString();

export const logger = {
  info: (...a) => process.env.NODE_ENV !== 'test' && console.log(`[${ts()}] INFO`, ...a),
  warn: (...a) => process.env.NODE_ENV !== 'test' && console.warn(`[${ts()}] WARN`, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
};
