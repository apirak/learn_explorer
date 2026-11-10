import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'
import { LIKERT_LABELS } from '~/components/ui/likert_scale'
import { PROFILE_STATUS_LABEL, formatTestTime } from '~/components/career_match_labels'
import AttemptTimeline from '~/components/attempt_timeline'

type Attempt = Data.Attempt.Variants['forDetail']

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH') : '–')

/** One attempt in full. Opening this page is audited; contact shows only with consent [DP-001]. */
export default function AdminStudent({ attempt: a }: InertiaProps<{ attempt: Attempt }>) {
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
        <AttemptTimeline attempt={a} />
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
        <h2>Career matches</h2>
        <dl className="records__pairs">
          <div>
            <dt>Desired career</dt>
            <dd>{a.desiredCareer ?? '–'}</dd>
          </div>
          <div>
            <dt>Test time</dt>
            <dd>{a.testTimeMs === null ? '–' : formatTestTime(a.testTimeMs)}</dd>
          </div>
        </dl>
        <p className="muted">
          เวลารวมระหว่างการบันทึกคำตอบแต่ละข้อ ไม่นับข้อแรก และไม่นับช่วงที่ห่างเกิน 5 นาที
          (ถือว่าออกไปแล้วกลับมา)
        </p>
        {a.careerMatchStatus === 'not_computed' ? (
          <p className="muted">ยังไม่ได้คำนวณ — กด backfill ที่หน้า Career matches</p>
        ) : (
          a.careerMatchStatus !== 'ok' && (
            <p className="muted">{PROFILE_STATUS_LABEL[a.careerMatchStatus]}</p>
          )
        )}
        {a.careers.length > 0 && (
          <table className="records__table">
            <thead>
              <tr>
                <th scope="col">Career</th>
                <th scope="col">Viewed</th>
                <th scope="col">Saved</th>
              </tr>
            </thead>
            <tbody>
              {a.careers.map((c) => (
                <tr key={c.code}>
                  <td>
                    {c.rank && <span className="muted">{c.rank}. </span>}
                    {c.title} <span className="muted">{c.code}</span>
                    {c.outsideLatest && <span className="muted"> · ไม่อยู่ในผลล่าสุด</span>}
                  </td>
                  <td>{fmt(c.viewedAt)}</td>
                  <td>{fmt(c.savedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
