import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Row = Data.CareerMatchRow
type Filters = {
  from: string | null
  to: string | null
  code: string | null
  overMinute: boolean
  consented: boolean
  q: string | null
}

type PageProps = InertiaProps<{
  filters: Filters
  pending: number
  contentVersion: string
  batchSize: number
  /** Test times below this are flagged; the "Time over 1 minute" filter keeps those above. */
  oneMinuteMs: number
  attempts: {
    data: Row[]
    metadata: { total: number; currentPage: number; lastPage: number }
  }
}>

/** Shown instead of matches for a profile the system cannot match. */
const STATUS_LABEL: Record<Exclude<Row['profileStatus'], 'ok' | null>, string> = {
  'all-dislike': 'ตอบไม่อยากทำทุกข้อ',
  'flat': 'คะแนนเท่ากันทุกด้าน',
}

/** Test time as m:ss. */
const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function Matches({ row }: { row: Row }) {
  if (!row.matchedAt) return <span className="muted">ยังไม่ได้คำนวณ</span>
  if (row.profileStatus && row.profileStatus !== 'ok')
    return <span className="muted">{STATUS_LABEL[row.profileStatus]}</span>
  return <>{row.careerMatches.join(' · ') || '–'}</>
}

/**
 * Desired career beside career matches, row by row (ADR 0005). No contact details, not even
 * masked, only whether one exists [DP-001].
 */
export default function AdminCareerMatches({
  filters,
  pending,
  contentVersion,
  batchSize,
  oneMinuteMs,
  attempts,
}: PageProps) {
  const { data, metadata } = attempts
  // Only the filters that are set, so the query string stays short.
  const filterQs = {
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
    code: filters.code ?? undefined,
    overMinute: filters.overMinute ? 1 : undefined,
    consented: filters.consented ? 1 : undefined,
    q: filters.q ?? undefined,
  }
  const pageUrl = (page: number) =>
    urlFor('admin.career_matches.index', {}, { qs: { ...filterQs, page } })

  return (
    <Page title="Career matches" description={`${metadata.total} attempts`}>
      <Form route="admin.career_matches.index" className="panel records__filters">
        <label className="field">
          <span className="field__label">From</span>
          <input
            className="field__input"
            type="date"
            name="from"
            defaultValue={filters.from ?? ''}
          />
        </label>
        <label className="field">
          <span className="field__label">To</span>
          <input className="field__input" type="date" name="to" defaultValue={filters.to ?? ''} />
        </label>
        <label className="field">
          <span className="field__label">Code</span>
          <input
            className="field__input"
            name="code"
            defaultValue={filters.code ?? ''}
            maxLength={64}
          />
        </label>
        <label className="field">
          <span className="field__label">Desired career</span>
          <input
            className="field__input"
            type="search"
            name="q"
            defaultValue={filters.q ?? ''}
            maxLength={100}
          />
        </label>
        <label className="records__check">
          <input type="checkbox" name="overMinute" value="1" defaultChecked={filters.overMinute} />
          Time over 1 minute
        </label>
        <label className="records__check">
          <input type="checkbox" name="consented" value="1" defaultChecked={filters.consented} />
          Consented only
        </label>
        <button type="submit" className="btn btn--secondary btn--sm">
          Filter
        </button>
      </Form>

      {pending > 0 && (
        <Form
          route="admin.career_matches.backfill"
          qs={filterQs}
          options={{ preserveScroll: true }}
          className="panel records__filters"
        >
          {({ processing }) => (
            <>
              <button type="submit" className="btn btn--primary btn--sm" disabled={processing}>
                คำนวณ {pending} รายการที่ยังไม่มีผล
              </button>
              <span className="muted">
                ครั้งละไม่เกิน {batchSize} รายการ เก่าสุดก่อน ใช้เนื้อหาเวอร์ชันปัจจุบัน (
                {contentVersion}) ไม่ใช่เวอร์ชันที่นักเรียนทำ
              </span>
            </>
          )}
        </Form>
      )}

      <div className="panel records">
        {data.length === 0 ? (
          <p className="muted">No attempts match.</p>
        ) : (
          <table className="records__table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Time</th>
                <th scope="col">Interest</th>
                <th scope="col">Career matches</th>
                <th scope="col">Desired career</th>
                <th scope="col">Consent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td className="records__nowrap">
                    <Link route="admin.students.show" routeParams={{ id: row.id }}>
                      {row.code ?? `#${row.id}`}
                    </Link>
                  </td>
                  <td>
                    {row.testTimeMs === null ? (
                      '–'
                    ) : (
                      <span
                        className={row.testTimeMs < oneMinuteMs ? 'records__flag' : undefined}
                        title={row.testTimeMs < oneMinuteMs ? 'Under 1 minute' : undefined}
                      >
                        {formatTime(row.testTimeMs)}
                      </span>
                    )}
                  </td>
                  <td>{row.interestCode ?? '–'}</td>
                  <td>
                    <Matches row={row} />
                  </td>
                  <td>{row.desiredCareer}</td>
                  <td>{row.consented ? '✓' : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {metadata.lastPage > 1 && (
        <nav className="records__pager" aria-label="Pages">
          {metadata.currentPage > 1 && (
            <Link href={pageUrl(metadata.currentPage - 1)} className="btn btn--ghost btn--sm">
              Previous
            </Link>
          )}
          <span className="muted">
            Page {metadata.currentPage} of {metadata.lastPage}
          </span>
          {metadata.currentPage < metadata.lastPage && (
            <Link href={pageUrl(metadata.currentPage + 1)} className="btn btn--ghost btn--sm">
              Next
            </Link>
          )}
        </nav>
      )}
    </Page>
  )
}

AdminCareerMatches.layout = [AppLayout]
