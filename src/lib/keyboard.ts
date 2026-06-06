'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[] = []) {
  // Default shortcuts
  const defaultShortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      meta: true,
      action: () => {
        // Command palette is handled by CommandPalette component
      },
      description: '打开命令面板',
    },
    {
      key: '/',
      meta: true,
      action: () => {
        // Show shortcuts help
        const event = new CustomEvent('show-shortcuts-help');
        window.dispatchEvent(event);
      },
      description: '显示快捷键帮助',
    },
    {
      key: 'b',
      meta: true,
      action: () => {
        // Toggle sidebar
        const sidebar = document.querySelector('aside');
        if (sidebar) {
          sidebar.classList.toggle('hidden');
        }
      },
      description: '切换侧边栏',
    },
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    for (const shortcut of allShortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : true;
      const altMatch = shortcut.alt ? e.altKey : true;

      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        metaMatch &&
        shiftMatch &&
        altMatch
      ) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [allShortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Global shortcuts component
export function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}
