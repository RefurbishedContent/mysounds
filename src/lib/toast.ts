import { toast } from 'sonner';

export const showSuccess = (message: string, description?: string) =>
  toast.success(message, {
    description,
    style: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
  });

export const showError = (message: string, description?: string) =>
  toast.error(message, {
    description,
    style: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
  });

export const showInfo = (message: string, description?: string) =>
  toast.info(message, {
    description,
    style: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
  });

export const showLoading = (message: string) =>
  toast.loading(message, {
    style: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
  });

export const dismissToast = (id: string | number) => toast.dismiss(id);
