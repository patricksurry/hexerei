import { useEffect } from 'react';
import './ShortcutsOverlay.css';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  {
    group: 'File',
    keys: [
      { key: 'Cmd+N', desc: 'New Map' },
      { key: 'Cmd+O', desc: 'Open Map' },
      { key: 'Cmd+S', desc: 'Save Map' },
    ],
  },
  {
    group: 'Navigation',
    keys: [
      { key: 'Cmd+K', desc: 'Focus Command Bar' },
      { key: 'Cmd+1', desc: 'Toggle Feature Stack' },
      { key: 'Cmd+2', desc: 'Toggle Inspector' },
      { key: 'Cmd+0', desc: 'Toggle Both Panels' },
      { key: 'Esc', desc: 'Exit Mode / Clear Selection' },
    ],
  },
  {
    group: 'Editing',
    keys: [
      { key: 'Cmd+Z', desc: 'Undo' },
      { key: 'Cmd+Shift+Z', desc: 'Redo' },
      { key: 'Cmd+D', desc: 'Duplicate Selection' },
      { key: 'Del / Bksp', desc: 'Delete Selection' },
    ],
  },
  {
    group: 'Selection',
    keys: [
      { key: 'Tab', desc: 'Next Element' },
      { key: 'Arrows', desc: 'Move Selection' },
    ],
  },
];

export const ShortcutsOverlay = ({ onClose }: ShortcutsOverlayProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div
        className="shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard Shortcuts"
      >
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map((group) => (
            <div key={group.group} className="shortcut-group">
              <h3>{group.group}</h3>
              {group.keys.map((s) => (
                <div key={s.key} className="shortcut-item">
                  <span className="shortcut-key font-mono">{s.key}</span>
                  <span className="shortcut-desc">{s.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
