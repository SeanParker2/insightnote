'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function ShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('show-shortcuts-help', handler);
    return () => window.removeEventListener('show-shortcuts-help', handler);
  }, []);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘', 'K'], description: '打开命令面板' },
    { keys: ['⌘', '/'], description: '显示快捷键帮助' },
    { keys: ['⌘', 'B'], description: '切换侧边栏' },
    { keys: ['↑', '↓'], description: '在列表中导航' },
    { keys: ['Enter'], description: '选择/确认' },
    { keys: ['Esc'], description: '关闭弹窗' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-surface-1 border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h3 className="text-lg font-semibold text-text-primary">键盘快捷键</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 bg-surface-2 border border-border-default rounded text-xs font-mono text-text-primary"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
