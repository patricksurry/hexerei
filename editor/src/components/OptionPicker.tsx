import './OptionPicker.css';

export interface OptionPickerOption<T extends string> {
  id: T;
  label: string;
  svg: React.ReactNode;
}

interface OptionPickerProps<T extends string> {
  value: T;
  options: OptionPickerOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
}

export const OptionPicker = <T extends string>({
  value,
  options,
  onChange,
  className = '',
  buttonClassName = '',
}: OptionPickerProps<T>) => (
  <div className={`option-picker ${className}`}>
    {options.map((opt) => (
      <button
        key={opt.id}
        className={`option-btn ${buttonClassName} ${value === opt.id ? 'active' : ''}`}
        title={opt.id}
        onClick={() => onChange(opt.id)}
        aria-label={opt.label}
        type="button"
      >
        {opt.svg}
      </button>
    ))}
  </div>
);
