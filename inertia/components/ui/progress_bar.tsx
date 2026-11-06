/** Progress through a fixed number of steps, shown as a bar and `x/total`. */
export default function ProgressBar({
  value,
  max,
  label,
  count = `${value}/${max}`,
}: {
  value: number
  max: number
  label: string
  /** The visible count; defaults to `value/max`. */
  count?: string
}) {
  const done = value >= max
  return (
    <div className={`progress${done ? ' progress--done' : ''}`}>
      <div
        className="progress__bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <i style={{ width: `${max ? (Math.min(value, max) / max) * 100 : 0}%` }} />
      </div>
      <span className="progress__count" aria-hidden="true">
        {count}
      </span>
    </div>
  )
}
