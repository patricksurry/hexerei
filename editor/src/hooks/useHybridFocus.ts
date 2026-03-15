import { useEffect } from 'react';

interface UseHybridFocusOptions {
  onCapture: (key: string) => void;
  enabled?: boolean;
}

const PRINTABLE_RE = /^[a-zA-Z0-9@/>.!,;:\-+~_ ]$/;

export function useHybridFocus({ onCapture, enabled = true }: UseHybridFocusOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Respect shortcuts that already claimed this event
      if (event.defaultPrevented) return;

      // Skip if modifier held (except shift — shift+number is valid for e.g. @ / > etc.)
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Skip if already in an input/textarea
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target.isContentEditable) return;

      // Skip non-printable keys
      if (!PRINTABLE_RE.test(event.key)) return;

      event.preventDefault();
      onCapture(event.key);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onCapture, enabled]);
}
