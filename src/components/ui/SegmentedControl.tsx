interface Option<T extends string> {
  value: T
  label: string
  icon?: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return <div className="segmented-control" role="group" aria-label={label}>
    {options.map((option) => <button
      key={option.value}
      type="button"
      className={value === option.value ? 'active' : ''}
      aria-pressed={value === option.value}
      onClick={() => onChange(option.value)}
    >{option.icon && <span aria-hidden="true">{option.icon}</span>}{option.label}</button>)}
  </div>
}
