import { useState } from 'react'
import { Form } from '@adonisjs/inertia/react'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import Section from '~/components/section'
import AppLayout from '~/layouts/app'

/** Admin and Owner: the retention period and the manual purge. Counts only [DP-001]. */
export default function AdminRetention({
  retentionDays,
  retentionDue = 0,
}: InertiaProps<{ retentionDays: number }>) {
  // Confirmed in the page, not with the browser's confirm().
  const [confirming, setConfirming] = useState(false)

  return (
    <Page
      title="Data retention"
      description="The app never deletes student data on its own. Purge it here."
    >
      <Section
        title="Retention period"
        description="Student data older than this is due for deletion. Same-browser resume still ends after 60 days, even when the period is longer."
      >
        <Form route="admin.retention.update" options={{ preserveScroll: true }}>
          {({ errors, processing }) => (
            <div className="auth__form">
              <div className="field">
                <label className="field__label" htmlFor="retentionDays">
                  Days to keep (1–3650)
                </label>
                <input
                  id="retentionDays"
                  name="retentionDays"
                  type="number"
                  min={1}
                  max={3650}
                  step={1}
                  required
                  className="field__input"
                  defaultValue={retentionDays}
                  aria-invalid={errors.retentionDays ? 'true' : 'false'}
                />
                {errors.retentionDays && (
                  <span className="field__error">{errors.retentionDays}</span>
                )}
              </div>
              <div>
                <button type="submit" className="btn btn--primary" disabled={processing}>
                  Save period
                </button>
              </div>
            </div>
          )}
        </Form>
      </Section>

      <Section
        title="Purge"
        description={`${retentionDue} attempts are older than ${retentionDays} days. Purging deletes them with their answers, career views, downloads and contact details. This cannot be undone.`}
      >
        {/* Shown but disabled when nothing is due, so admins know where Purge lives. */}
        {confirming && retentionDue > 0 ? (
          <Form route="admin.retention.purge" onSuccess={() => setConfirming(false)}>
            {({ processing }) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span>Delete {retentionDue} attempts for good? This cannot be undone.</span>
                <button type="submit" className="btn btn--primary" disabled={processing}>
                  Yes, delete {retentionDue} attempts
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </Form>
        ) : (
          <button
            type="button"
            className="btn btn--secondary"
            disabled={retentionDue === 0}
            title={retentionDue === 0 ? 'Nothing to delete' : undefined}
            onClick={() => setConfirming(true)}
          >
            {retentionDue === 0 ? 'Purge (nothing to delete)' : `Purge ${retentionDue} attempts`}
          </button>
        )}
      </Section>
    </Page>
  )
}

AdminRetention.layout = [AppLayout]
