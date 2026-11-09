import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Save } from 'lucide-react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Chip from '~/components/ui/chip'

const FIT_LABELS = { best: 'เหมาะมาก', great: 'เหมาะ', good: 'พอใช้' }
const PROFILE_MAX = 7 // O*NET interest scores run 1–7

/** One matched occupation: titles, its RIASEC profile, and the TCAS fields that lead to it (prototype careerView). */
export default function StudentCareer({
  occupation: o,
}: InertiaProps<{ occupation: Data.Occupation }>) {
  return (
    <main className="ip result">
      <Head title={o.title} />
      <div className="result-stack">
        <Link route="student.careers" className="back">
          ← กลับ
        </Link>
        <div className="sheet">
          <div>
            <div className="occ-head">
              <h1 className="occ-name">{o.title}</h1>
              <Chip tone="lime">{FIT_LABELS[o.fit]}</Chip>
            </div>
            {o.title !== o.titleEn && <p className="small muted">{o.titleEn}</p>}
          </div>

          <h2>รูปแบบความสนใจของงานนี้</h2>
          <ul className="profile">
            {o.profile.map((p) => (
              <li key={p.type}>
                <span className="small">
                  {p.type} · {p.name}
                </span>
                <meter min={1} max={PROFILE_MAX} value={p.score} aria-label={p.name} />
              </li>
            ))}
          </ul>
          <a
            className="small"
            href={`https://www.onetonline.org/link/summary/${o.code}`}
            target="_blank"
            rel="noreferrer"
          >
            อ่านรายละเอียดอาชีพ (ภาษาอังกฤษ) ใน O*NET OnLine
          </a>

          <h2>สาขาที่เรียนได้</h2>
          {o.fields.length === 0 ? (
            <p className="small muted">ยังไม่มีข้อมูลสาขาที่เชื่อมกับอาชีพนี้</p>
          ) : (
            <div className="tcas-fields">
              {o.fields.map((f) => (
                <details key={f.key} className="tcas-field">
                  <summary>
                    <span className="field-name">{f.name}</span>{' '}
                    <span className="muted small">{f.programCount} หลักสูตร</span>
                    {f.unsure && <span className="tag">ยังไม่แน่ใจ</span>}
                  </summary>
                  {f.group && <p className="small muted">กลุ่ม{f.group}</p>}
                  <ul className="programs">
                    {f.programs.map((p, i) => (
                      // mytcas ids repeat across admission rounds, so the index is the key
                      <li key={i}>
                        <b>{p.university}</b>
                        {p.campus && p.campus !== 'วิทยาเขตหลัก' && ` ${p.campus}`}{' '}
                        <span className="muted">
                          {p.faculty} · {p.program} ({p.type})
                        </span>
                      </li>
                    ))}
                  </ul>
                  {f.programCount > f.programs.length && (
                    <p className="small muted">
                      และอีก {f.programCount - f.programs.length} หลักสูตร
                    </p>
                  )}
                </details>
              ))}
            </div>
          )}
          <p className="small muted">
            สาขาและหลักสูตรมาจากข้อมูล mytcas การจับคู่อาชีพกับสาขายังเป็นฉบับร่าง
            ควรอ่านรายละเอียดหลักสูตรก่อนตัดสินใจ
          </p>
        </div>
        <Link route="student.mypath" className="btn btn--primary">
          <Save size={18} aria-hidden />
          เก็บผลไว้ดูทีหลัง
        </Link>
      </div>
    </main>
  )
}
