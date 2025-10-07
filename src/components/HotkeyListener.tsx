import { useEffect } from 'react';

interface HotkeyMapping {
  id: string;
  key: string;
}

interface HotkeyListenerProps {
  mapping: HotkeyMapping[];
  disabled?: boolean;
  debounceMs?: number;
}

export default function HotkeyListener({ 
  mapping = [], 
  disabled = false, 
  debounceMs = 220 
}: HotkeyListenerProps) {
  useEffect(() => {
    if (disabled) return;

    const isTyping = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return ['input', 'textarea', 'select', 'button'].includes(tag) || el.isContentEditable;
    };

    const normalizeKey = (e: KeyboardEvent): string => {
      const base = (e.code === 'Space' || e.key === ' ') ? 'Space' :
                   (e.key?.length === 1 ? e.key.toUpperCase() : (e.key || ''));
      const mods = [
        e.ctrlKey ? 'Ctrl+' : '',
        e.altKey ? 'Alt+' : '',
        e.shiftKey ? 'Shift+' : ''
      ].join('');
      return (mods + base).replace(/\+\s*$/, '');
    };

    let lastTrigger = 0;

    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      const key = normalizeKey(e);
      const match = mapping.find(m => 
        (m.key || '').toLowerCase() === key.toLowerCase()
      );

      if (!match) return;

      const now = Date.now();
      if (now - lastTrigger < debounceMs) return;
      lastTrigger = now;

      e.preventDefault();
      const btn = document.querySelector(`[data-btn-id="${match.id}"]`);
      if (btn instanceof HTMLElement) btn.click();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mapping, disabled, debounceMs]);

  return null;
}
