import { type ReactNode } from 'react'

/** A small sticker label, e.g. a role or a fit level. */
export default function Chip({
  tone = 'purple',
  children,
}: {
  tone?: 'purple' | 'lime'
  children: ReactNode
}) {
  return <span className={`chip chip--${tone}`}>{children}</span>
}
