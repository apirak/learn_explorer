import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { props } = usePage()
  return (
    <>
      <header className="header header--floating">
        <div className="header__inner">
          <Logo size={28} />
          <div className="header__right">
            {props.user ? (
              <Link route="account.show" className="btn btn--primary btn--sm">
                Account
              </Link>
            ) : (
              <>
                <Link route="session.create" className="btn btn--ghost btn--sm">
                  Sign in
                </Link>
                <Link route="new_account.create" className="btn btn--primary btn--sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
      <FlashToasts />
    </>
  )
}
