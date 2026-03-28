import './OrientationPicker.css';

type Orientation = 'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left';

interface OrientationPickerProps {
  value: Orientation;
  onChange: (value: Orientation) => void;
}

// 3-hex cluster SVGs with tight viewBox cropped to content bounds.
// Flat clusters are landscape (~13.5 x 7.5), pointy are portrait (~7.5 x 13.5).

const ORIENTATIONS: { id: Orientation; label: string; svg: React.ReactNode }[] = [
  { id: 'flat-down', label: 'Flat Down', svg: (
    <svg viewBox="5 7.3 13.5 7.5">
      <polygon points="10.5,10 9.25,12.17 6.75,12.17 5.5,10 6.75,7.83 9.25,7.83" />
      <polygon points="14.25,12.17 13,14.34 10.5,14.34 9.25,12.17 10.5,10 13,10" opacity="0.45" />
      <polygon points="18,10 16.75,12.17 14.25,12.17 13,10 14.25,7.83 16.75,7.83" opacity="0.45" />
    </svg>
  )},
  { id: 'flat-up', label: 'Flat Up', svg: (
    <svg viewBox="5 9.2 13.5 7.5">
      <polygon points="10.5,14 9.25,16.17 6.75,16.17 5.5,14 6.75,11.83 9.25,11.83" />
      <polygon points="14.25,11.83 13,14 10.5,14 9.25,11.83 10.5,9.66 13,9.66" opacity="0.45" />
      <polygon points="18,14 16.75,16.17 14.25,16.17 13,14 14.25,11.83 16.75,11.83" opacity="0.45" />
    </svg>
  )},
  { id: 'pointy-right', label: 'Pointy Right', svg: (
    <svg viewBox="7.3 5 7.5 13.5">
      <polygon points="12.17,9.25 10,10.5 7.83,9.25 7.83,6.75 10,5.5 12.17,6.75" />
      <polygon points="14.34,13 12.17,14.25 10,13 10,10.5 12.17,9.25 14.34,10.5" opacity="0.45" />
      <polygon points="12.17,16.75 10,18 7.83,16.75 7.83,14.25 10,13 12.17,14.25" opacity="0.45" />
    </svg>
  )},
  { id: 'pointy-left', label: 'Pointy Left', svg: (
    <svg viewBox="9.2 5 7.5 13.5">
      <polygon points="16.17,9.25 14,10.5 11.83,9.25 11.83,6.75 14,5.5 16.17,6.75" />
      <polygon points="14,13 11.83,14.25 9.66,13 9.66,10.5 11.83,9.25 14,10.5" opacity="0.45" />
      <polygon points="16.17,16.75 14,18 11.83,16.75 11.83,14.25 14,13 16.17,14.25" opacity="0.45" />
    </svg>
  )}
];

export const OrientationPicker = ({ value, onChange }: OrientationPickerProps) => (
  <div className="orientation-picker">
    {ORIENTATIONS.map(opt => (
      <button
        key={opt.id}
        className={`orientation-btn ${value === opt.id ? 'active' : ''}`}
        title={opt.id}
        onClick={() => onChange(opt.id)}
        aria-label={opt.label}
      >
        {opt.svg}
      </button>
    ))}
  </div>
);
