import './ColorPicker.css';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => (
  <div className="color-picker">
    <div className="color-picker-preview" style={{ backgroundColor: value }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Pick color"
      />
    </div>
    <span className="color-picker-hex font-mono">{value.toUpperCase()}</span>
  </div>
);
