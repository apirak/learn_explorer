import { useId } from 'react'

/** Thai answer labels, value 0–4 (from the prototype's SCALE_LABELS). */
export const LIKERT_LABELS = ['ไม่อยากทำเลย', 'ไม่อยากทำ', 'ไม่แน่ใจ', 'อยากทำ', 'อยากทำมาก']

/** Face features drawn on a 64×64 rounded square, one per answer value 0–4. */
const FACES = [
  <>
    <path className="feat" d="M18 20l8 8M26 20l-8 8M38 20l8 8M46 20l-8 8" />
    <path className="feat" d="M20 48q12-10 24 0" />
  </>,
  <>
    <circle className="dot" cx="23" cy="25" r="4" />
    <circle className="dot" cx="41" cy="25" r="4" />
    <path className="feat" d="M21 47q11-9 22 0" />
  </>,
  <>
    <circle className="dot" cx="23" cy="25" r="4" />
    <circle className="dot" cx="41" cy="25" r="4" />
    <path className="feat" d="M22 45l20-6" />
  </>,
  <>
    <circle className="dot" cx="23" cy="25" r="4" />
    <circle className="dot" cx="41" cy="25" r="4" />
    <path className="feat" d="M20 40q12 10 24 0" />
  </>,
  <>
    <path className="feat" d="M18 26q5-6 10 0M36 26q5-6 10 0" />
    <path className="dot" d="M17 37h30q-2 15-15 15t-15-15z" />
  </>,
]

function LikertFace({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="likert__face">
      <rect className="face" x="2" y="2" width="60" height="60" rx="12" />
      {FACES[value]}
    </svg>
  )
}

/**
 * Five-step "how much would you like it" scale. Real radio inputs sharing
 * one `name`, so the browser gives arrow-key navigation, Tab-in/Tab-out and
 * screen-reader announcements for free. `labelledBy` points at the question.
 */
export default function LikertScale({
  name,
  value,
  onChange,
  labelledBy,
}: {
  name: string
  value: number | null
  onChange: (value: number) => void
  labelledBy: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="likert">
      {LIKERT_LABELS.map((label, v) => (
        <label key={v} className="likert__opt" htmlFor={`${id}-${v}`}>
          <input
            id={`${id}-${v}`}
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="likert__input"
          />
          <LikertFace value={v} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}
