import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

interface CustomAlertContextType {
  showAlert: (message: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, options?: Partial<AlertOptions>) => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAlert, setActiveAlert] = useState<AlertOptions | null>(null);

  // Expose global window override for pure standard alerts if any exist
  useEffect(() => {
    (window as any).customAlert = (message: string) => {
      setActiveAlert({
        message,
        type: 'warning',
        title: 'Aviso',
        confirmText: 'Ok'
      });
    };
    // Also override standard window.alert safely
    window.alert = (message: string) => {
      (window as any).customAlert(message);
    };
  }, []);

  const showAlert = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'warning', title = 'Aviso') => {
    setActiveAlert({
      message,
      type,
      title,
      confirmText: 'Ok'
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = 'Confirmar', options?: Partial<AlertOptions>) => {
    setActiveAlert({
      message,
      type: 'warning',
      title,
      isConfirm: true,
      onConfirm,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      ...options
    });
  };

  const handleConfirm = () => {
    if (activeAlert?.onConfirm) {
      activeAlert.onConfirm();
    }
    setActiveAlert(null);
  };

  const handleCancel = () => {
    if (activeAlert?.onCancel) {
      activeAlert.onCancel();
    }
    setActiveAlert(null);
  };

  return (
    <CustomAlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AnimatePresence>
        {activeAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[9999]"
            >
              {/* Header style depending on type */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${
                    activeAlert.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    activeAlert.type === 'error' ? 'bg-rose-50 text-rose-600' :
                    activeAlert.type === 'info' ? 'bg-indigo-50 text-indigo-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {activeAlert.type === 'success' && <CheckCircle className="w-6 h-6" />}
                    {activeAlert.type === 'error' && <AlertTriangle className="w-6 h-6" />}
                    {activeAlert.type === 'info' && <Info className="w-6 h-6" />}
                    {activeAlert.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {activeAlert.title || (activeAlert.isConfirm ? 'Confirmar' : 'Alerta')}
                    </h3>
                    <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                      {activeAlert.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                {activeAlert.isConfirm && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    {activeAlert.cancelText || 'Cancelar'}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:brightness-110 ${
                    activeAlert.type === 'error' ? 'bg-rose-600' :
                    activeAlert.type === 'success' ? 'bg-emerald-600' :
                    'bg-indigo-600'
                  }`}
                >
                  {activeAlert.confirmText || 'Ok'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </CustomAlertContext.Provider>
  );
};

export const useCustomAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) throw new Error('useCustomAlert must be used within CustomAlertProvider');
  return context;
};
