import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import FlashToasts from '~/components/flash_toasts'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="auth">
        <div className="auth__form-col">
          <Logo size={28} />
          <div className="auth__form-wrap">{children}</div>
          <div style={{ height: 20 }} />
        </div>

        <aside className="auth__aside">
          <p className="auth__quote">
            Every student carries a direction. Our job is to help them find it.
          </p>

          <div>
            <div className="pitch__t">For the OnDemand team only</div>
            <p className="pitch__p">
              New accounts start as Member. Ask the Owner to grant Admin access.
            </p>
            <p className="pitch__p">
              Student data is protected under Thailand’s PDPA — do not export or share outside the
              team.
            </p>
          </div>
        </aside>
      </div>
      <FlashToasts />
    </>
  )
}
