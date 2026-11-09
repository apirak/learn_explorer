import { Form, Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Report = Data.Report
type FunnelStep = Report['funnel'][number]['step']

const STEP_LABEL: Record<FunnelStep, string> = {
  start: 'Start',
  testComplete: 'ตอบครบทุกข้อ',
  result: 'Result',
  career: 'Career',
  mypath: 'MyPath',
  download: 'Download',
}

/** `YYYY-MM-DD` shifted by whole days; plain UTC math, the dates carry no time. */
const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–')

/** Cohort report: attempts started between two Bangkok dates. Counts only [DP-001]. */
export default function AdminReport({
  from,
  to,
  today,
  retentionDays,
  report,
}: InertiaProps<{
  from: string
  to: string
  today: string
  retentionDays: number
  report: Report
}>) {
  const presets = [
    { label: 'วันนี้', from: today },
    { label: '7 วัน', from: shift(today, -6) },
    { label: '30 วัน', from: shift(today, -29) },
  ]
  const oldest = shift(today, -retentionDays)

  return (
    <Page
      title="Report"
      description={from === to ? `เริ่มทำวันที่ ${from}` : `เริ่มทำระหว่าง ${from} ถึง ${to}`}
      actions={presets.map((p) => {
        const active = p.from === from && to === today
        return (
          <Link
            key={p.label}
            href={urlFor('admin.report', {}, { qs: { from: p.from, to: today } })}
            className={`btn btn--sm ${active ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={active ? 'page' : undefined}
          >
            {p.label}
          </Link>
        )
      })}
    >
      <Form route="admin.report" className="panel records__filters">
        <label className="field">
          <span className="field__label">จาก</span>
          <input
            className="field__input"
            type="date"
            name="from"
            defaultValue={from}
            min={oldest}
            max={today}
          />
        </label>
        <label className="field">
          <span className="field__label">ถึง</span>
          <input
            className="field__input"
            type="date"
            name="to"
            defaultValue={to}
            min={oldest}
            max={today}
          />
        </label>
        <button type="submit" className="btn btn--secondary btn--sm">
          ดูรายงาน
        </button>
      </Form>

      <dl className="report__totals">
        <div className="panel">
          <dt>น้อง (ประมาณ)</dt>
          <dd>{report.totals.students}</dd>
        </div>
        <div className="panel">
          <dt>Attempts</dt>
          <dd>{report.totals.attempts}</dd>
        </div>
        <div className="panel">
          <dt>น้องที่มี campaign code</dt>
          <dd>{report.totals.campaign}</dd>
        </div>
      </dl>

      <Funnel report={report} />
      <Incomplete incomplete={report.incomplete} itemTotal={report.itemTotal} />
      <Nps nps={report.nps} from={from} to={to} />
      <Gaps gaps={report.gaps} />
    </Page>
  )
}

function Funnel({ report }: { report: Report }) {
  const { funnel } = report
  const start = funnel[0].count
  const drops = funnel.map((s, i) => (i === 0 ? 0 : funnel[i - 1].count - s.count))
  const worst = Math.max(...drops)

  return (
    <section className="panel report__section">
      <h2 className="section__title">Funnel</h2>
      <p className="section__description">
        % ของ Start · % จากขั้นก่อน · จำนวนที่หลุด ขั้นที่หลุดมากที่สุดเป็นสีเข้ม
      </p>
      <ol className="report-funnel">
        {funnel.map((s, i) => {
          const isWorst = worst > 0 && drops[i] === worst
          return (
            <li
              key={s.step}
              className={`report-funnel__row${isWorst ? ' report-funnel__row--worst' : ''}`}
            >
              <span className="report-funnel__label">{STEP_LABEL[s.step]}</span>
              <span className="report-funnel__track">
                <span
                  className="report-funnel__bar"
                  style={{ width: `${start ? (s.count / start) * 100 : 0}%` }}
                />
              </span>
              <span className="report-funnel__figures">
                <strong>{s.count}</strong>
                {i > 0 && (
                  <span>
                    {pct(s.count, start)} · {pct(s.count, funnel[i - 1].count)} · หลุด {drops[i]}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="section__description">
        Contact: ก่อน Career {report.contacts.contact} · MyPath {report.contacts.mypath}
      </p>
    </section>
  )
}

function Incomplete({
  incomplete,
  itemTotal,
}: {
  incomplete: Report['incomplete']
  itemTotal: number
}) {
  const bars = [
    { label: 'ยังไม่ตอบ', count: incomplete.none },
    ...incomplete.buckets.map((count, i) => ({ label: `${i * 10}%`, count })),
  ]
  return (
    <section className="panel report__section">
      <h2 className="section__title">ทำไม่ครบ {incomplete.total} ครั้ง</h2>
      <p className="section__description">
        แยกตามสัดส่วนข้อที่ตอบไป (จาก {itemTotal} ข้อ, ช่องละ 10%) ไม่รวม attempt ที่ทำครบ
      </p>
      <Histogram bars={bars} />
    </section>
  )
}

function Gaps({ gaps }: { gaps: Report['gaps'] }) {
  return (
    <section className="panel report__section">
      <h2 className="section__title">เวลาต่อข้อ (วินาที)</h2>
      <p className="section__description">
        นับทุกคำตอบ ไม่นับข้อแรก และตัดช่วงที่ห่างเกิน 5 นาที (ออกไปแล้วกลับมา)
        คำตอบที่ค้างในคิวออฟไลน์แล้วส่งพร้อมกันอาจทำให้ช่อง &lt;1 สูงเกินจริง
      </p>
      {gaps.some((g) => g.count > 0) ? (
        <Histogram bars={gaps} />
      ) : (
        <p className="muted">ยังไม่มีข้อมูลเวลาในช่วงนี้</p>
      )}
    </section>
  )
}

const BANDS = [
  { key: 'detractor', label: 'Detractor 0–6' },
  { key: 'passive', label: 'Passive 7–8' },
  { key: 'promoter', label: 'Promoter 9–10' },
] as const

/** NPS = % Promoter − % Detractor, over the cohort's responses. Comments open on their own page. */
function Nps({ nps, from, to }: { nps: Report['nps']; from: string; to: string }) {
  return (
    <section className="panel report__section">
      <h2 className="section__title">NPS {nps.score === null ? '—' : nps.score}</h2>
      <p className="section__description">
        “อยากชวนเพื่อนมาลองแบบทดสอบนี้แค่ไหน?” (0–10) ในหน้า 5 อาชีพ · ตอบ {nps.responses} จาก{' '}
        {nps.careersViewed} ที่เปิดหน้านั้น ({pct(nps.responses, nps.careersViewed)})
      </p>
      {nps.responses === 0 ? (
        <p className="muted">ยังไม่มีคนตอบในช่วงนี้</p>
      ) : (
        <>
          <div className="nps-bands" aria-hidden>
            {BANDS.map((b) => (
              <span
                key={b.key}
                className={`is-${b.key}`}
                style={{ width: `${(nps.groups[b.key] / nps.responses) * 100}%` }}
              />
            ))}
          </div>
          <dl className="report__totals">
            {BANDS.map((b) => (
              <div key={b.key} className="panel">
                <dt>{b.label}</dt>
                <dd>
                  {nps.groups[b.key]} <small>({pct(nps.groups[b.key], nps.responses)})</small>
                </dd>
              </div>
            ))}
          </dl>
          <Histogram bars={nps.scores.map((count, n) => ({ label: String(n), count }))} />
        </>
      )}
      <Link
        href={urlFor('admin.report.nps', {}, { qs: { from, to } })}
        className="btn btn--secondary btn--sm"
      >
        ดูความคิดเห็น ({nps.comments})
      </Link>
    </section>
  )
}

function Histogram({ bars }: { bars: { label: string; count: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <ul className="histogram">
      {bars.map((b) => (
        <li key={b.label} className="histogram__col">
          <span className="histogram__count">{b.count}</span>
          <span className="histogram__track">
            <span className="histogram__bar" style={{ height: `${(b.count / max) * 100}%` }} />
          </span>
          <span className="histogram__label">{b.label}</span>
        </li>
      ))}
    </ul>
  )
}

AdminReport.layout = [AppLayout]
