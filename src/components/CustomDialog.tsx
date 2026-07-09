import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function CustomDialog({
  isOpen,
  type,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel
}: CustomDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 shadow-2xl max-w-sm w-full rounded-2xl overflow-hidden text-slate-100 p-6"
        >
          <div className="text-center space-y-4">
            {isDestructive ? (
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-500 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto text-orange-400 border border-orange-500/20">
                <Info className="h-6 w-6" />
              </div>
            )}
            
            <h3 className="text-base font-extrabold text-white font-sans">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">{message}</p>
          </div>

          <div className="flex gap-3 mt-6">
            {type === 'confirm' && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs transition border border-slate-750"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 font-bold py-2.5 px-3 rounded-xl text-xs transition text-white ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-550 shadow-lg shadow-rose-500/15'
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-500/15'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
