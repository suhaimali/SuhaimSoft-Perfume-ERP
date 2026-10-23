import { toast } from 'sonner';

// Auto-dismiss previous toast whenever a new toast is called
const wrapToastMethod = (originalMethod) => {
  return (...args) => {
    try {
      toast.dismiss();
    } catch {}
    return originalMethod.apply(toast, args);
  };
};

if (toast) {
  if (typeof toast.success === 'function') toast.success = wrapToastMethod(toast.success);
  if (typeof toast.error === 'function') toast.error = wrapToastMethod(toast.error);
  if (typeof toast.info === 'function') toast.info = wrapToastMethod(toast.info);
  if (typeof toast.warning === 'function') toast.warning = wrapToastMethod(toast.warning);
  if (typeof toast.message === 'function') toast.message = wrapToastMethod(toast.message);
}

export default toast;
