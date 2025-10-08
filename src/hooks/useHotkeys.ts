import { useEffect } from 'react';

interface HotkeyMapping {
  id: string;
  key: string;
}

export function useHotkeys(mapping: HotkeyMapping[], disabled: boolean = false) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Defensive guard: event.key might be undefined in some edge cases
      // This prevents "Cannot read properties of undefined (reading 'toLowerCase')" errors
      const key = (event.key || '').toLowerCase();
      
      // Early return if no key is pressed
      if (!key) return;
      
      // Defensive guard: mapping key might be undefined or empty
      const match = mapping.find(m => (m.key || '').toLowerCase() === key);
      
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
