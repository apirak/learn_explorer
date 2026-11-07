import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import { LayoutGrid, LogOut, UserRound, UsersRound } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'
import NavLink, { type NavItem } from '~/components/nav_link'

/**
 * Top-level app navigation. Add an entry here for every new area of your
 * app, and it shows up in the navigation bar with its active state handled.
 */
const nav: NavItem[] = [{ label: 'Account', route: 'account.show', icon: UserRound }]

export default function AppLayout({ children }: { children: ReactNode }) {
  const user = usePage().props.user
  return (
    <>
      <header className="header header--bar">
        <div className="header__inner">
          <Logo size={28} />
          <div className="header__right">
            <Form route="session.destroy">
              <button type="submit" className="btn btn--secondary btn--sm">
                <LogOut size={15} /> Log out
              </button>
            </Form>
          </div>
        </div>
      </header>

      <nav className="subnav">
        <div className="subnav__inner">
          {nav.map(({ label, route, icon: Icon }) => (
            <NavLink key={label} route={route} className="subnav__item">
              {Icon && <Icon size={14} />}
              {label}
            </NavLink>
          ))}
          {/* Visible to everyone; works once the Owner makes you an admin. */}
          {user?.isAdmin ? (
            <NavLink route="admin.dashboard" className="subnav__item">
              <LayoutGrid size={14} />
              Admin
            </NavLink>
          ) : (
            <span className="subnav__item" aria-disabled="true" title="Admins only">
              <LayoutGrid size={14} />
              Admin
            </span>
          )}
          {user?.role === 'owner' && (
            <NavLink route="admin.users.index" className="subnav__item">
              <UsersRound size={14} />
              Users
            </NavLink>
          )}
        </div>
      </nav>

      <div className="app-main">{children}</div>
      <FlashToasts />
    </>
  )
}
