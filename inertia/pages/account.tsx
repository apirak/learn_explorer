import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import AppLayout from '~/layouts/app'
import Section from '~/components/section'
import Page from '~/components/page'
import Chip from '~/components/ui/chip'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' } as const

function Field({
  name,
  label,
  error,
  ...input
}: {
  name: string
  label: string
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field__input"
        aria-invalid={error ? 'true' : 'false'}
        {...input}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

export default function Account() {
  const user = usePage().props.user!
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Page title="Account" description="Manage your account settings and preferences.">
      <div className="panel">
        <Section title="Role" description="The Owner decides who is an admin.">
          <div>
            <Chip tone={user.role === 'member' ? 'purple' : 'lime'}>{ROLE_LABEL[user.role]}</Chip>
          </div>
        </Section>

        <Section title="Profile" description={user.email}>
          <Form route="account.profile" options={{ preserveScroll: true }}>
            {({ errors, processing }) => (
              <div className="auth__form">
                <Field
                  name="fullName"
                  label="Full name"
                  autoComplete="name"
                  defaultValue={user.fullName ?? ''}
                  error={errors.fullName}
                />
                <Field
                  name="affiliation"
                  label="Affiliation"
                  placeholder="Team or school"
                  maxLength={120}
                  defaultValue={user.affiliation ?? ''}
                  error={errors.affiliation}
                />
                <div>
                  <button type="submit" className="btn btn--primary" disabled={processing}>
                    Save profile
                  </button>
                </div>
              </div>
            )}
          </Form>
        </Section>

        <Section title="Password">
          <Form route="account.password" resetOnSuccess options={{ preserveScroll: true }}>
            {({ errors, processing }) => (
              <div className="auth__form">
                <Field
                  name="currentPassword"
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  error={errors.currentPassword}
                />
                <Field
                  name="password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  error={errors.password}
                />
                <Field
                  name="passwordConfirmation"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  error={errors.passwordConfirmation}
                />
                <div>
                  <button type="submit" className="btn btn--primary" disabled={processing}>
                    Change password
                  </button>
                </div>
              </div>
            )}
          </Form>
        </Section>

        <Section title="Session">
          <Form route="session.destroy">
            <button type="submit" className="btn btn--secondary">
              <LogOut size={15} /> Log out
            </button>
          </Form>
        </Section>

        {user.role !== 'owner' && (
          <Section
            title="Delete account"
            description="Your account is removed for good. Student records are not affected."
          >
            {confirmDelete ? (
              <Form route="account.destroy">
                {({ processing }) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn--primary" disabled={processing}>
                      Yes, delete my account
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Form>
            ) : (
              <div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete account
                </button>
              </div>
            )}
          </Section>
        )}
      </div>
    </Page>
  )
}

Account.layout = AppLayout
