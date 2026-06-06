'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter') {
      handleConfirm();
    }
  }, [onClose, handleConfirm]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isVisible) return null;

  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-signal-up/20',
      iconColor: 'text-signal-up',
      confirmBg: 'bg-signal-up hover:bg-signal-up/90',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      confirmBg: 'bg-amber-500 hover:bg-amber-500/90',
    },
    info: {
      icon: AlertTriangle,
      iconBg: 'bg-brand/20',
      iconColor: 'text-brand-light',
      confirmBg: 'bg-brand hover:bg-brand-dark',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`relative w-full max-w-md mx-4 bg-surface-1 border border-border-default rounded-2xl shadow-2xl overflow-hidden ${isOpen ? 'scale-100' : 'scale-95'} transition-transform`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.iconBg}`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-text-secondary">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-surface-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm text-white font-medium rounded-lg transition-colors ${config.confirmBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirm dialog
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const confirm = useCallback((options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...options,
        onConfirm: () => {
          options.onConfirm();
          resolve(true);
        },
      });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    config,
    confirm,
    handleClose,
  };
}
