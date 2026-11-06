import lynx from '~/images/lynx.png'
import { Link } from '@adonisjs/inertia/react'

export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <Link route="student.home" aria-label="Learn Explorer" style={{ display: 'inline-flex' }}>
      {/* Apple's icon corner is ~22.37% of the side. */}
      <img src={lynx} width={size} height={size} alt="" style={{ borderRadius: '22.37%' }} />
    </Link>
  )
}
