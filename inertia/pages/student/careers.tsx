import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Attribution from '~/components/ui/attribution'
import Chip from '~/components/ui/chip'

const FIT_LABELS = { best: 'เหมาะมาก', great: 'เหมาะ', good: 'พอใช้' }

/** The top 5 matching occupations (prototype careersView). */
export default function StudentCareers({
  guess,
  matches,
  attribution,
}: InertiaProps<{ guess: string | null; matches: Data.OccupationMatch[]; attribution: string }>) {
  return (
    <main className="ip result">
      <Head title="5 อาชีพที่น่าลองดู" />
      <div className="result-stack">
        <Link route="student.result" className="back">
          ← กลับ
        </Link>
        <header>
          <h1>5 อาชีพที่น่าลองดู</h1>
          <p className="muted">
            อาชีพระดับปริญญาตรีขึ้นไปที่มีรูปแบบความสนใจใกล้กับน้องที่สุด
            ระดับความเหมาะใช้เกณฑ์เดียวกับ O*NET กดการ์ดเพื่อดูสาขาที่เรียนได้
          </p>
        </header>
        {guess && (
          <p className="guess-echo">
            ก่อนเริ่ม น้องเดาไว้ว่า <b>{guess}</b> ลองเทียบกับ 5 อาชีพด้านล่างดู
            ตรงหรือต่างจากที่คิด?
          </p>
        )}
        <div className="occ">
          {matches.map((m) => (
            <Link
              key={m.code}
              route="student.career"
              routeParams={{ code: m.code }}
              className="occ-card"
            >
              <span className="occ-head">
                <span className="occ-name">{m.title}</span>
                <Chip tone="lime">{FIT_LABELS[m.fit]}</Chip>
              </span>
              {m.title !== m.titleEn && <span className="small muted">{m.titleEn}</span>}
              <span className="small">
                <span className="tag">{m.typeCode || '—'}</span>{' '}
                <span className="muted">
                  {m.shared.length
                    ? `งานนี้ใช้ความเป็น${m.shared.join(' และ ')} ซึ่งน้องมีสูง`
                    : 'รูปแบบความสนใจโดยรวมคล้ายกับของน้อง'}
                </span>
              </span>
              {m.fields.length > 0 && (
                <span className="small">
                  สาขาที่เรียนได้:{' '}
                  {m.fields.map((f) => f.name + (f.unsure ? ' (ยังไม่แน่ใจ)' : '')).join(' · ')}
                </span>
              )}
              <span className="small more">ดูสาขาที่เรียนได้ →</span>
            </Link>
          ))}
        </div>
      </div>
      <Attribution text={attribution} />
    </main>
  )
}
