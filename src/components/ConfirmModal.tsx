import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = true
}: ConfirmModalProps) {
  const [isExecuting, setIsExecuting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsExecuting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-100 flex flex-col relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content area */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-4 ${
                isDestructive 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {title}
              </h3>
              
              <p className="text-sm text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Footer / Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isExecuting}
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleConfirm}
                className={`px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDestructive 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 hover:shadow-rose-200' 
                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 hover:shadow-amber-200'
                }`}
              >
                {isExecuting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : null}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
