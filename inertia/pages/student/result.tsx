import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Attribution from '~/components/ui/attribution'

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'] as const

/** Holland hexagon: six axes, grid rings at quarters, the score shape on top (prototype app.js). */
function Hexagon({ scores, max }: { scores: Data.Result['scores']; max: number }) {
  const W = 260
  const c = W / 2
  const R = 88
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    return [c + r * Math.cos(a), c + r * Math.sin(a)]
  }
  const ring = (k: number) => RIASEC.map((_, i) => pt(i, R * k).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${W}`} role="img" aria-label="หกเหลี่ยม Holland แสดงคะแนนทั้ง 6 ด้าน">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={ring(k)} className="hex-grid" />
      ))}
      {RIASEC.map((t, i) => {
        const [x, y] = pt(i, R)
        return <line key={t} x1={c} y1={c} x2={x} y2={y} className="hex-grid" />
      })}
      <polygon
        className="hex-shape"
        points={RIASEC.map((t, i) => pt(i, (R * scores[t]) / max).join(',')).join(' ')}
      />
      {RIASEC.map((t, i) => {
        const [x, y] = pt(i, R + 22)
        return (
          <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {t}
          </text>
        )
      })}
    </svg>
  )
}

function Invalid({ status }: { status: Data.Result['status'] }) {
  return (
    <div className="sheet">
      <h1>ยังบอกผลไม่ได้</h1>
      <p className="muted">
        {status === 'all-dislike'
          ? 'น้องตอบ “ไม่อยากทำเลย” ทุกข้อ ผลจึงอาจไม่สะท้อนความสนใจจริง ลองกลับมาทำใหม่ในวันอื่นก็ได้'
          : 'คะแนนทุกด้านเท่ากัน ลองย้อนกลับไปทบทวนคำตอบ และเลือกตามความรู้สึกจริงว่าอยากทำแค่ไหน'}
      </p>
      <div className="nav">
        <Link route="student.test.show" qs={{ review: 1 }} className="btn btn--primary">
          กลับไปทบทวน
        </Link>
      </div>
    </div>
  )
}

export default function StudentResult({
  result,
  attribution,
}: InertiaProps<{ result: Data.Result; attribution: string }>) {
  return (
    <main className="ip result">
      <Head title="ผลของน้อง" />
      {result.status !== 'ok' ? (
        <Invalid status={result.status} />
      ) : (
        <div className="sheet">
          <span className="eyebrow">รหัสความสนใจของน้อง</span>
          <div className="code-row">
            <span className="code">{result.code.join('')}</span>
            <span className="muted small">
              เรียงจากมากไปน้อย
              <br />
              อิงทฤษฎี RIASEC ของ Holland
            </span>
          </div>
          <div className="hexwrap">
            <Hexagon scores={result.scores} max={result.max} />
          </div>
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
          <Link route="student.careers" className="btn btn--primary">
            5 อาชีพที่น่าลองดู →
          </Link>
        </div>
      )}
      <Attribution text={attribution} />
    </main>
  )
}
