import { useEffect, useRef, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'] as const

/** Holland hexagon: six axes, grid rings at quarters, the score shape on top (prototype app.js). */
export function Hexagon({ scores, max }: { scores: Data.Result['scores']; max: number }) {
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

/** Reveal timeline (ms): the hexagon builds axis by axis, then the code letters lock one by one. */
const T = {
  axisStart: 500,
  axisStagger: 260,
  axisDur: 640,
  lockStart: 2350,
  lockStagger: 380,
  spinTick: 70,
  restAfter: 260,
}
const STATUS = ['กำลังรวมคำตอบของน้อง', 'กำลังคิดคะแนนทั้ง 6 ด้าน', 'กำลังหาตัวอักษรเด่น 3 ตัว']
const POP = 'cubic-bezier(.3, .7, .4, 1.5)' // the Sticker Lab "slap" overshoot
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** Sticker confetti: inked palette pieces thrown up from `from`, falling under gravity. */
function stickerConfetti(from: DOMRect) {
  const colors = ['var(--lime)', 'var(--purple)', 'var(--violet)', 'var(--paper)', '#ff8fb8']
  const shapes = ['pill', 'dot', 'square', 'star']
  const layer = document.createElement('div')
  layer.className = 'confetti-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.append(layer)
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2
  const burst = (n: number, delay: number, spread: number) => {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i')
      p.className = `confetti confetti--${shapes[i % shapes.length]}`
      Object.assign(p.style, {
        background: colors[i % colors.length],
        left: `${cx}px`,
        top: `${cy}px`,
      })
      layer.append(p)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const speed = 420 + Math.random() * 520
      const [vx, vy] = [Math.cos(angle) * speed * 0.6, Math.sin(angle) * speed]
      const g = 1500 + Math.random() * 500
      const spin = (Math.random() - 0.5) * 1440
      const dur = 1700 + Math.random() * 900
      // ponytail: a parabola sampled at 9 keyframes; enough for a 2s throw.
      const frames = Array.from({ length: 9 }, (_, k) => {
        const t = (k / 8) * (dur / 1000)
        return {
          transform: `translate(${vx * t}px, ${vy * t + (g * t * t) / 2}px) rotate(${(spin * k) / 8}deg)`,
          opacity: k < 7 ? 1 : 0,
        }
      })
      p.animate(frames, { duration: dur, delay, easing: 'linear', fill: 'both' })
    }
  }
  burst(46, 0, Math.PI * 0.9)
  burst(28, 140, Math.PI * 1.4)
  setTimeout(() => layer.remove(), 3200)
}

/**
 * The first view builds the result: the shape grows axis by axis, the code spins like a slot
 * reel and locks letter by letter, then sticker confetti. Reduced motion skips to the end.
 */
function Profile({ result, reveal }: { result: Data.Result; reveal: boolean }) {
  const [p, setP] = useState(() => RIASEC.map((): number => (reveal ? 0 : 1)))
  const [locked, setLocked] = useState(reveal ? 0 : result.code.length)
  const [reel, setReel] = useState(result.code)
  const [status, setStatus] = useState<number | 'done' | null>(reveal ? 0 : null)
  const [rest, setRest] = useState(!reveal)
  const hexRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!reveal) return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const finish = () => {
      setP(RIASEC.map(() => 1))
      setLocked(result.code.length)
      setStatus(null)
      setRest(true)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      at(0, finish)
      return () => timers.forEach(clearTimeout)
    }

    const t0 = performance.now()
    const growEnd = T.axisStart + 5 * T.axisStagger + T.axisDur
    let raf = 0
    const grow = (now: number) => {
      const e = now - t0
      setP(
        RIASEC.map((_, i) => easeOut(clamp01((e - T.axisStart - i * T.axisStagger) / T.axisDur)))
      )
      if (e < growEnd) raf = requestAnimationFrame(grow)
    }
    raf = requestAnimationFrame(grow)
    RIASEC.forEach((_, i) =>
      at(T.axisStart + i * T.axisStagger + T.axisDur * 0.55, () =>
        hexRef.current?.querySelectorAll('text')[i]?.animate(
          [
            { scale: 1, fill: 'var(--ink)' },
            { scale: 1.5, fill: 'var(--violet)', offset: 0.35 },
            { scale: 1, fill: 'var(--ink)' },
          ],
          { duration: 420, easing: 'cubic-bezier(.16, 1, .3, 1)' }
        )
      )
    )

    at(T.axisStart + 2 * T.axisStagger, () => setStatus(1))
    at(T.lockStart - 200, () => setStatus(2))

    const spin = window.setInterval(
      () => setReel(result.code.map(() => RIASEC[Math.floor(Math.random() * 6)])),
      T.spinTick
    )
    result.code.forEach((_, i) =>
      at(T.lockStart + i * T.lockStagger, () => {
        setLocked(i + 1)
        codeRef.current?.children[i]?.animate(
          [
            { scale: 1.6, rotate: '-12deg' },
            { scale: 1, rotate: '0deg' },
          ],
          { duration: 360, easing: POP }
        )
      })
    )
    const done = T.lockStart + (result.code.length - 1) * T.lockStagger
    at(done, () => {
      window.clearInterval(spin)
      setStatus('done')
      codeRef.current?.animate([{ scale: 1 }, { scale: 1.12, offset: 0.3 }, { scale: 1 }], {
        duration: 500,
        easing: 'cubic-bezier(.16, 1, .3, 1)',
      })
      if (codeRef.current) stickerConfetti(codeRef.current.getBoundingClientRect())
    })
    at(done + T.restAfter, () => setRest(true))

    return () => {
      timers.forEach(clearTimeout)
      window.clearInterval(spin)
      cancelAnimationFrame(raf)
    }
  }, [reveal, result.code])

  const scores = Object.fromEntries(
    RIASEC.map((t, i) => [t, result.scores[t] * p[i]])
  ) as Data.Result['scores']
  const thinking = typeof status === 'number'
  const restClass = rest ? 'reveal-rest is-in' : 'reveal-rest'

  return (
    <div className="sheet">
      <span className="eyebrow">รหัสความสนใจของน้อง</span>
      <div className="code-row">
        <span ref={codeRef} className="code">
          {result.code.map((letter, i) => (
            <span
              key={i}
              className={i < locked ? 'slot' : 'slot slot--spin'}
              aria-hidden={i >= locked}
            >
              {i < locked ? letter : reel[i]}
            </span>
          ))}
        </span>
        <span className="muted small">
          เรียงจากมากไปน้อย
          <br />
          อิงทฤษฎี RIASEC ของ Holland
        </span>
      </div>
      <div className="hexwrap" ref={hexRef}>
        <Hexagon scores={scores} max={result.max} />
      </div>
      {status !== null && (
        <p className="reveal-status" role="status">
          {thinking ? (
            <span className="shimmer">{STATUS[status]}…</span>
          ) : (
            <span className="reveal-done">เจอแล้ว!</span>
          )}
        </p>
      )}
      <div className={`types ${restClass}`}>
        {result.types.map((t) => (
          <div key={t.type} className="type">
            <h3>
              {t.type} · {t.name}
            </h3>
            <p className="small muted">{t.desc}</p>
          </div>
        ))}
      </div>
      <Link route="student.contact" className={`btn btn--primary ${restClass}`}>
        5 อาชีพที่น่าลองดู →
      </Link>
    </div>
  )
}

export default function StudentResult({
  result,
  reveal,
}: InertiaProps<{ result: Data.Result; reveal: boolean }>) {
  return (
    <main className="ip result">
      <Head title="ผลของน้อง" />
      {result.status !== 'ok' ? (
        <Invalid status={result.status} />
      ) : (
        <Profile result={result} reveal={reveal} />
      )}
    </main>
  )
}
