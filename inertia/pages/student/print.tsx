import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Attribution from '~/components/ui/attribution'
import { Hexagon } from '~/pages/student/result'

/** The result laid out for printing, saving as PDF, or a screenshot. v1 generates no file. */
export default function StudentPrint({
  result,
  matches,
  attribution,
}: InertiaProps<{ result: Data.Result; matches: Data.OccupationMatch[]; attribution: string }>) {
  return (
    <main className="ip result print">
      <Head title="ผลของน้อง (พิมพ์ได้)" />
      <div className="result-stack">
        <div className="print-hint no-print">
          <p>
            <b>บันทึกผลเก็บไว้:</b> กดปุ่มด้านล่าง แล้วเลือก “บันทึกเป็น PDF” (Save as PDF)
            ในช่องเครื่องพิมพ์ หรือแคปหน้าจอไว้ก็ได้
          </p>
          <div className="nav">
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>
              พิมพ์ / บันทึกเป็น PDF
            </button>
            <Link route="student.careers" className="btn btn--ghost">
              กลับ
            </Link>
          </div>
        </div>

        <div className="sheet">
          <span className="eyebrow">รหัสความสนใจของน้อง</span>
          <div className="code-row">
            <span className="code">{result.status === 'ok' ? result.code.join('') : '—'}</span>
            <span className="muted small">อิงทฤษฎี RIASEC ของ Holland</span>
          </div>
          <div className="hexwrap">
            <Hexagon scores={result.scores} max={result.max} />
          </div>
          {result.status === 'ok' && (
            <div className="types">
              {result.types.map((t) => (
                <div key={t.type} className="type">
                  <h3>
                    {t.type} · {t.name}
                  </h3>
                  <p className="small muted">{t.desc}</p>
                </div>
              ))}
            </div>
          )}

          {matches.length > 0 && (
            <>
              <h2>อาชีพที่น่าลองดู</h2>
              <ol className="print-careers">
                {matches.map((m) => (
                  <li key={m.code}>
                    <b>{m.title}</b>
                    {m.title !== m.titleEn && <span className="muted"> ({m.titleEn})</span>}
                    {m.fields.length > 0 && (
                      <div className="small">
                        สาขาที่เรียนได้: {m.fields.map((f) => f.name).join(' · ')}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
          <Attribution text={attribution} />
        </div>
      </div>
    </main>
  )
}
