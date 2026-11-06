/** Progress through a fixed number of steps, shown as a bar and `x/total`. */
export default function ProgressBar({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label: string
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
        {value}/{max}
      </span>
    </div>
  )
}
