import React, { useRef } from 'react';
import './CommandBar.css';

interface CommandBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  onSubmit?: (value: string) => void;
}

export function CommandBar({
  value = '',
  onChange,
  onFocus,
  onBlur,
  onClear,
  onSubmit,
}: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const getMode = (val: string) => {
    if (val.startsWith('>')) return 'command';
    if (val.startsWith('/')) return 'search';
    return 'path';
  };

  const mode = getMode(value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClear?.();
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      onSubmit?.(value);
    }
  };

  return (
    <div className="command-bar">
      <div className={`mode-badge mode-${mode}`}>
        {mode.toUpperCase()}
      </div>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="command"
        aria-expanded="false"
        aria-haspopup="listbox"
        autoComplete="off"
        spellCheck="false"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className="command-input font-mono"
        placeholder="Enter HexPath, /search, or >command"
      />
    </div>
  );
}
