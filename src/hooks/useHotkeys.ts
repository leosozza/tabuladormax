import { useEffect } from 'react';

interface HotkeyMapping {
  id: string;
  key: string;
}

export function useHotkeys(mapping: HotkeyMapping[], disabled: boolean = false) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      const match = mapping.find(m => m.key && m.key.toLowerCase() === key);
      
      if (match) {
        event.preventDefault();
        const button = document.querySelector(`[data-btn-id="${match.id}"]`) as HTMLButtonElement;
        if (button) {
          button.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapping, disabled]);
}
