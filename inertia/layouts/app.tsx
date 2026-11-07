import Logo from '~/components/logo'
import { type ReactNode } from 'react'
import {
  Archive,
  ChartColumn,
  GraduationCap,
  LayoutGrid,
  LogOut,
  TriangleAlert,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import FlashToasts from '~/components/flash_toasts'
import NavLink, { type NavItem } from '~/components/nav_link'

/**
 * Top-level app navigation. Add an entry here for every new area of your
 * app, and it shows up in the navigation bar with its active state handled.
 */
const nav: NavItem[] = [{ label: 'Account', route: 'account.show', icon: UserRound }]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, retentionDue } = usePage().props
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
          {/* Visible to everyone; works once the Owner makes you an admin. */}
          {user?.isAdmin ? (
            <NavLink route="admin.dashboard" exact className="subnav__item">
              <LayoutGrid size={14} />
              Dashboard
            </NavLink>
          ) : (
            <span className="subnav__item" aria-disabled="true" title="Admins only">
              <LayoutGrid size={14} />
              Dashboard
            </span>
          )}
          {user?.isAdmin && (
            <NavLink route="admin.report" className="subnav__item">
              <ChartColumn size={14} />
              Report
            </NavLink>
          )}
          {user?.isAdmin && (
            <NavLink route="admin.students.index" className="subnav__item">
              <GraduationCap size={14} />
              Students
            </NavLink>
          )}
          {/* Shown disabled to members, like Dashboard, so they know Purge lives here. */}
          {user?.isAdmin ? (
            <NavLink route="admin.retention.show" className="subnav__item">
              <Archive size={14} />
              Retention
            </NavLink>
          ) : (
            <span className="subnav__item" aria-disabled="true" title="Admins only">
              <Archive size={14} />
              Retention
            </span>
          )}
          <span className="subnav__spacer" />
          {user?.isOwner && (
            <NavLink route="admin.users.index" className="subnav__item">
              <UsersRound size={14} />
              Users
            </NavLink>
          )}
          {nav.map(({ label, route, icon: Icon }) => (
            <NavLink key={label} route={route} className="subnav__item">
              {Icon && <Icon size={14} />}
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Admin pages only. The app warns; an admin decides when to purge. */}
      {!!retentionDue && (
        <div className="retention-banner" role="status">
          <TriangleAlert size={16} />
          <span>{retentionDue} attempts are past the retention period.</span>
          <Link route="admin.retention.show">Review and purge</Link>
        </div>
      )}

      <div className="app-main">{children}</div>
      <FlashToasts />
    </>
  )
}
