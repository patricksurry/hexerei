import { OptionPicker, type OptionPickerOption } from './OptionPicker';
import './OriginPicker.css';

type Origin = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface OriginPickerProps {
  value: Origin;
  onChange: (value: Origin) => void;
}

// Square outline with an accent-colored hex dot at the relevant corner.
const hexAt = (cx: number, cy: number) => {
  const r = 2.2;
  const h = r * 0.866;
  return `${cx + r},${cy} ${cx + r / 2},${cy + h} ${cx - r / 2},${cy + h} ${cx - r},${cy} ${cx - r / 2},${cy - h} ${cx + r / 2},${cy - h}`;
};

const ORIGINS: OptionPickerOption<Origin>[] = [
  {
    id: 'top-left',
    label: 'Top Left',
    svg: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="1" className="origin-outline" />
        <polygon points={hexAt(6, 6)} className="origin-dot" />
      </svg>
    ),
  },
  {
    id: 'top-right',
    label: 'Top Right',
    svg: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="1" className="origin-outline" />
        <polygon points={hexAt(18, 6)} className="origin-dot" />
      </svg>
    ),
  },
  {
    id: 'bottom-left',
    label: 'Bottom Left',
    svg: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="1" className="origin-outline" />
        <polygon points={hexAt(6, 18)} className="origin-dot" />
      </svg>
    ),
  },
  {
    id: 'bottom-right',
    label: 'Bottom Right',
    svg: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="1" className="origin-outline" />
        <polygon points={hexAt(18, 18)} className="origin-dot" />
      </svg>
    ),
  },
];

export const OriginPicker = ({ value, onChange }: OriginPickerProps) => (
  <OptionPicker
    value={value}
    options={ORIGINS}
    onChange={onChange}
    className="origin-picker"
    buttonClassName="origin-btn"
  />
);
