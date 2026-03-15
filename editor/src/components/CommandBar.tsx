import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import './CommandBar.css';

interface CommandBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  onSubmit?: (value: string) => void;
  error?: string;
  gotoSuggestions?: { label: string; index: number }[];
}

export interface CommandBarRef {
  focus: () => void;
  blur: () => void;
}

const SEARCH_KEYS = ['terrain', 'label', 'id', 'at', 'tags'];

export const CommandBar = forwardRef<CommandBarRef, CommandBarProps>(
  ({ value = '', onChange, onClear, onSubmit, error, gotoSuggestions }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    const getMode = (val: string) => {
      if (val.startsWith('>')) return 'command';
      if (val.startsWith('/')) return 'search';
      if (val.startsWith('@')) return 'goto';
      return 'path';
    };

    const mode = getMode(value);
    const showKeyDropdown = mode === 'search' && !value.includes(':');
    const showGotoDropdown = mode === 'goto' && gotoSuggestions && gotoSuggestions.length > 0;

    const renderTokens = () => {
      // Simple tokenizer for HexPath
      // Atoms (coordinates): accent-hex/edge/vertex
      // Operators (+ - , ; !): text-secondary
      // Keywords (@all): text-primary font-bold

      if (mode !== 'path') return value;

      const tokens = value.split(/(\s+|[,;!+-])/);
      return tokens.map((token, i) => {
        if (!token) return null;
        if (/\s+/.test(token)) return <span key={i}>{token}</span>;
        if ([',', ';', '!', '+', '-'].includes(token))
          return (
            <span key={i} style={{ color: 'var(--text-secondary)' }}>
              {token}
            </span>
          );
        if (token === '@all')
          return (
            <span key={i} style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
              {token}
            </span>
          );

        // Determine atom type
        let color = 'var(--accent-hex)';
        if (token.includes('/')) color = 'var(--accent-edge)';
        if (token.includes('.')) color = 'var(--accent-vertex)';
        if (token.includes('@')) color = 'var(--accent-edge)'; // Approximate

        return (
          <span key={i} style={{ color }}>
            {token}
          </span>
        );
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClear?.();
        inputRef.current?.blur();
      } else if (e.key === 'Enter') {
        onSubmit?.(value);
      }
    };

    return (
      <div className="command-bar-wrapper">
        <div className={`command-bar ${error ? 'has-error' : ''}`}>
          <div className={`mode-badge mode-${mode}`}>{mode.toUpperCase()}</div>
          <div className="command-input-container">
            <div className="command-input-overlay font-mono">{renderTokens()}</div>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="command"
              aria-expanded={showKeyDropdown || showGotoDropdown ? 'true' : 'false'}
              aria-haspopup="listbox"
              autoComplete="off"
              spellCheck="false"
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              className="command-input font-mono"
              placeholder="Enter HexPath, /search, or >command"
            />
          </div>
        </div>
        {showKeyDropdown && (
          <ul className="command-dropdown" role="listbox">
            {SEARCH_KEYS.map((key) => (
              <li
                key={key}
                role="option"
                className="command-dropdown-item"
                onClick={() => onChange?.(`/${key}:`)}
              >
                {key}
              </li>
            ))}
          </ul>
        )}
        {showGotoDropdown && (
          <ul className="command-dropdown" role="listbox">
            {gotoSuggestions!.map((s) => (
              <li
                key={s.index}
                role="option"
                className="command-dropdown-item"
                onClick={() => onSubmit?.(`@${s.label}`)}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
        {error && <div className="command-error-message">{error}</div>}
      </div>
    );
  }
);

CommandBar.displayName = 'CommandBar';
