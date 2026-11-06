import lynx from '~/images/lynx.png'
import { Link } from '@adonisjs/inertia/react'

export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <Link route="student.home" aria-label="Learn Explorer" style={{ display: 'inline-flex' }}>
      <img src={lynx} width={size} height={size} alt="" />
    </Link>
  )
}
