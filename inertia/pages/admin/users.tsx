import { useState } from 'react'
import { Form } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'
import Chip from '~/components/ui/chip'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' } as const

/** Owner only: every staff account with role controls and the ownership transfer. */
export default function AdminUsers({ users }: InertiaProps<{ users: Data.User[] }>) {
  // The transfer is confirmed in the page, not with the browser's confirm().
  const [confirmId, setConfirmId] = useState<number | null>(null)

  return (
    <Page title="Users" description="Grant or remove Admin, or hand ownership to someone else.">
      <ul className="panel staff">
        {users.map((u) => {
          const name = u.fullName ?? u.email
          return (
            <li key={u.id} className="staff__row">
              <div className="staff__who">
                <strong>{name}</strong>
                <span className="muted">
                  {u.email}
                  {u.affiliation && ` · ${u.affiliation}`}
                </span>
              </div>
              <Chip tone={u.role === 'member' ? 'purple' : 'lime'}>{ROLE_LABEL[u.role]}</Chip>
              {!u.isOwner &&
                (confirmId === u.id ? (
                  <Form
                    route="admin.users.transfer"
                    routeParams={{ id: u.id }}
                    className="staff__actions"
                  >
                    {({ processing }) => (
                      <>
                        <span>Make {name} the Owner? You become an Admin.</span>
                        <button
                          type="submit"
                          className="btn btn--primary btn--sm"
                          disabled={processing}
                        >
                          Yes, transfer
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </Form>
                ) : (
                  <div className="staff__actions">
                    <Form
                      route="admin.users.role"
                      routeParams={{ id: u.id }}
                      options={{ preserveScroll: true }}
                    >
                      {({ processing }) => (
                        <>
                          <input
                            type="hidden"
                            name="role"
                            value={u.role === 'admin' ? 'member' : 'admin'}
                          />
                          <button
                            type="submit"
                            className="btn btn--secondary btn--sm"
                            disabled={processing}
                          >
                            {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </>
                      )}
                    </Form>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setConfirmId(u.id)}
                    >
                      Transfer ownership
                    </button>
                  </div>
                ))}
            </li>
          )
        })}
      </ul>
    </Page>
  )
}

AdminUsers.layout = [AppLayout]
