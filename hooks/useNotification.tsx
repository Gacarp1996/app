// src/hooks/useNotification.tsx
import { toast } from 'sonner';
import { ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export const useNotification = () => {
  
  // ============ NOTIFICACIONES SIMPLES ============
  const success = (message: string, description?: string) => {
    return toast.success(message, {
      description,
      className: 'sonner-success',
      style: {
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.5)',
      },
    });
  };

  const error = (message: string, description?: string) => {
    return toast.error(message, {
      description,
      duration: 6000,
      className: 'sonner-error',
      style: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.5)',
      },
    });
  };

  const warning = (message: string, description?: string) => {
    return toast.warning(message, {
      description,
      className: 'sonner-warning',
      style: {
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.5)',
      },
    });
  };

  const info = (message: string, description?: string) => {
    return toast.info(message, {
      description,
      className: 'sonner-info',
      style: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.5)',
      },
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      className: 'sonner-loading',
    });
  };

  // ============ CONFIRMACIÓN CON PROMISE ============
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const {
        title = 'Confirmar acción',
        message,
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        type = 'info'
      } = options;

      // Estilos según tipo
      const styles = {
        danger: {
          icon: '⚠️',
          confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-500/20',
          iconBorder: 'border-red-500/30',
        },
        warning: {
          icon: '⚡',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          iconBg: 'bg-yellow-500/20',
          iconBorder: 'border-yellow-500/30',
        },
        info: {
          icon: 'ℹ️',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          iconBg: 'bg-blue-500/20',
          iconBorder: 'border-blue-500/30',
        }
      };

      const style = styles[type];

      toast.custom(
        (t) => (
          <div className="w-full max-w-md p-6 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${style.iconBg} border ${style.iconBorder}`}>
                <span className="text-xl">{style.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                <div className="text-gray-300 text-sm leading-relaxed">{message}</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(false);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg 
                         transition-all duration-200 font-medium text-sm
                         focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(true);
                }}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-all duration-200 
                          font-medium text-sm focus:outline-none focus:ring-2 ${style.confirmBtn}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
          unstyled: true,
        }
      );
    });
  };

  // ============ PROMPT (PARA INPUTS) ============
  const prompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      const {
        title = 'Ingrese un valor',
        message,
        placeholder = '',
        defaultValue = '',
        confirmText = 'Aceptar',
        cancelText = 'Cancelar'
      } = options;

      let inputValue = defaultValue;

      toast.custom(
        (t) => (
          <div className="w-full max-w-md p-6 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-300 text-sm mb-4">{message}</p>
            
            <input
              type="text"
              defaultValue={defaultValue}
              placeholder={placeholder}
              onChange={(e) => { inputValue = e.target.value; }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 
                       focus:ring-2 focus:ring-blue-500/20 mb-4"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg 
                         transition-all duration-200 font-medium text-sm"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t);
                  resolve(inputValue);
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-all duration-200 font-medium text-sm"
              >
                {confirmText}
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
          unstyled: true,
        }
      );
    });
  };

  // ============ TOAST CON ACCIÓN ============
  const action = (message: string, actionLabel: string, onAction: () => void) => {
    return toast(message, {
      action: {
        label: actionLabel,
        onClick: onAction,
      },
      className: 'sonner-action',
    });
  };

  // ============ PROMISE TOAST ============
  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  };

  // ============ DISMISS ============
  const dismiss = (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  return {
    // Notificaciones básicas
    success,
    error,
    warning,
    info,
    loading,
    
    // Interactivas
    confirm,
    prompt,
    action,
    promise,
    
    // Control
    dismiss,
    
    // Exponer toast para casos especiales
    toast,
  };
};