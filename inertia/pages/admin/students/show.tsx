import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'
import { LIKERT_LABELS } from '~/components/ui/likert_scale'

type Attempt = Data.Attempt.Variants['forDetail']

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH') : '–')

/** One attempt in full. Opening this page is audited; contact shows only with consent [DP-001]. */
export default function AdminStudent({ attempt: a }: InertiaProps<{ attempt: Attempt }>) {
  const timeline: [string, string | null][] = [
    ['Test', a.createdAt],
    ['Result', a.resultAt],
    ['Career', a.careerAt],
    ['MyPath', a.mypathAt],
    ['Download', a.downloadedAt],
  ]

  return (
    <Page
      title={`Attempt #${a.id}`}
      description={`Code ${a.code ?? '–'} · content ${a.contentVersion}`}
      actions={
        <Link route="admin.students.index" className="btn btn--ghost btn--sm">
          All students
        </Link>
      }
    >
      <section className="panel records">
        <h2>Timeline</h2>
        <dl className="records__pairs">
          {timeline.map(([label, at]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{fmt(at)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel records">
        <h2>Result</h2>
        {a.scores ? (
          <>
            <p>
              Interest code <strong>{a.interestCode}</strong> · {a.profileStatus}
            </p>
            <dl className="records__pairs">
              {Object.entries(a.scores).map(([type, score]) => (
                <div key={type}>
                  <dt>{type}</dt>
                  <dd>{score}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="muted">Not all questions answered yet.</p>
        )}
      </section>

      <section className="panel records">
        <h2>Careers viewed</h2>
        {a.careersViewed.length ? (
          <ul>
            {a.careersViewed.map((c) => (
              <li key={c.code}>
                {c.title} <span className="muted">{c.code}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None.</p>
        )}
      </section>

      <section className="panel records">
        <h2>Contact</h2>
        {a.contact ? (
          <dl className="records__pairs">
            <div>
              <dt>Name</dt>
              <dd>{a.contact.name ?? '–'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{a.contact.phone ?? '–'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{a.contact.email ?? '–'}</dd>
            </div>
            <div>
              <dt>Consent</dt>
              <dd>
                {fmt(a.contact.consentAt)} · {a.contact.consentVersion}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="muted">No consent given.</p>
        )}
      </section>

      <section className="panel records">
        <h2>Answers ({a.answers.length})</h2>
        {a.answers.length ? (
          <table className="records__table">
            <tbody>
              {a.answers.map((ans) => (
                <tr key={ans.itemId}>
                  <td className="muted">{ans.type}</td>
                  <td>{ans.text}</td>
                  <td>{LIKERT_LABELS[ans.value]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No answers yet.</p>
        )}
      </section>
    </Page>
  )
}

AdminStudent.layout = [AppLayout]
