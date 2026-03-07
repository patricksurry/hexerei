import { useEffect } from 'react';

type ShortcutMap = Record<string, () => void>;

/**
 * Hook to register global keyboard shortcuts.
 * Supports 'mod' which is Command on Mac and Ctrl on others.
 * Format: 'mod+k', 'mod+1', etc.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    // Simple Mac detection
    const isMac = navigator.userAgent.includes('Mac');

    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split('+');
        
        const hasMod = parts.includes('mod');
        const mainKey = parts.find(p => p !== 'mod');

        if (hasMod === modifier && mainKey === key) {
          // If in an input, only certain shortcuts should trigger
          const isInput = event.target instanceof HTMLInputElement || 
                        event.target instanceof HTMLTextAreaElement;
          
          if (isInput && !['k'].includes(key)) {
            continue;
          }

          event.preventDefault();
          handler();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [shortcuts]);
}
