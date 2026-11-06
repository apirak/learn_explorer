import { useLayoutEffect, useRef, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { client } from '~/client'
import { type InertiaProps } from '~/types'
import LikertScale from '~/components/ui/likert_scale'
import ProgressBar from '~/components/ui/progress_bar'

type Item = { id: string; text: string; type: string }

/** Question change motion, from the prototype (app.js STEP_MOTION). */
const STEP_MOTION = {
  travel: 0.8,
  gap: 22,
  duration: 660,
  stagger: 60,
  blur: 0.5,
  scale: 0.84,
  easing: 'cubic-bezier(.16, 1, .3, 1)',
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** The new question is already rendered; a copy of the old one leaves on top of it. */
function animateStep(q: HTMLElement, oldText: string, dir: number) {
  q.parentElement!.querySelectorAll('.question-ghost').forEach((g) => g.remove()) // a fast tap cancels the last exit
  const ghost = document.createElement('p')
  ghost.className = 'question question-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  ghost.textContent = oldText
  Object.assign(ghost.style, {
    top: `${q.offsetTop}px`,
    left: `${q.offsetLeft}px`,
    width: `${q.offsetWidth}px`,
  })
  q.parentElement!.append(ghost)
  const m = STEP_MOTION
  const d = (Math.max(ghost.offsetHeight, q.offsetHeight) * m.travel + m.gap) * dir
  const away = (y: number) => ({
    transform: reducedMotion() ? 'none' : `translateY(${y}px) scale(${m.scale})`,
    opacity: 0,
    filter: `blur(${m.blur}px)`,
  })
  const home = { transform: 'none', opacity: 1, filter: 'none' }
  ghost
    .animate([home, away(-d)], { duration: m.duration, easing: m.easing, fill: 'forwards' })
    .finished.then(
      () => ghost.remove(),
      () => {}
    )
  setTimeout(() => ghost.remove(), m.duration + 300) // in case animations never run (background tab)
  q.animate([away(d), home], {
    duration: m.duration,
    delay: m.stagger,
    easing: m.easing,
    fill: 'backwards',
  })
}

/** The tapped face shrinks into the progress bar's leading edge, which bumps on arrival. */
function flyToBar(svg: Element, bar: HTMLElement) {
  if (reducedMotion()) return
  const from = svg.getBoundingClientRect()
  const to = bar.getBoundingClientRect()
  const fill = bar.querySelector('i')!
  const copy = document.createElement('div')
  copy.className = 'face-fly'
  copy.append(svg.cloneNode(true))
  Object.assign(copy.style, {
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
  })
  document.body.append(copy)
  setTimeout(() => copy.remove(), 900)
  const tx =
    to.left + to.width * (Number.parseFloat(fill.style.width) / 100) - from.left - from.width / 2
  const ty = to.top + to.height / 2 - from.top - from.height / 2
  copy
    .animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate(${tx * 0.5}px, ${ty * 0.5 - 40}px) scale(.7)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(${tx}px, ${ty}px) scale(.18)`, opacity: 0.2 },
      ],
      { duration: 520, easing: 'cubic-bezier(.5, 0, .3, 1)' }
    )
    .finished.then(
      () => {
        copy.remove()
        bar.animate(
          [{ transform: 'none' }, { transform: 'scaleY(2.2)', offset: 0.4 }, { transform: 'none' }],
          { duration: 320, easing: 'cubic-bezier(.16, 1, .3, 1)' }
        )
      },
      () => {}
    )
}

export default function StudentTest({
  items,
  answers: saved,
  total,
}: InertiaProps<{
  items: Item[]
  answers: Record<string, number>
  total: number
}>) {
  const [answers, setAnswers] = useState(saved)
  const [serverAnswered, setServerAnswered] = useState(Object.keys(saved).length)
  // Refresh resumes at the first unanswered question.
  const [idx, setIdx] = useState(() => {
    const open = items.findIndex((it) => !(it.id in saved))
    return open === -1 ? items.length - 1 : open
  })
  const question = useRef<HTMLParagraphElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const step = useRef<{ oldText: string; dir: number } | null>(null)

  const item = items[idx]
  const done = items.filter((it) => it.id in answers).length
  // "ดูผล" waits for the server to hold every answer, not just this browser.
  const ready = done === total && serverAnswered === total

  useLayoutEffect(() => {
    if (step.current) animateStep(question.current!, step.current.oldText, step.current.dir)
    step.current = null
  }, [idx])

  function go(by: number) {
    const next = Math.max(0, Math.min(total - 1, idx + by))
    if (next === idx) return
    step.current = { oldText: item.text, dir: Math.sign(by) }
    setIdx(next)
  }

  // ponytail: one send per tap, failures only logged; the retry queue is #7.
  async function answer(value: number) {
    setAnswers((a) => ({ ...a, [item.id]: value }))
    if (idx < total - 1) {
      const face = card.current!.querySelectorAll('.likert__face')[value]
      flyToBar(face, card.current!.parentElement!.querySelector('.progress__bar')!)
      go(1) // no delay: next question right away
    }
    const [data, error] = await client.api.student.test
      .answer({ body: { itemId: item.id, value } })
      .safe()
    if (error) return console.error('answer not saved', item.id, error.status ?? error.kind)
    setServerAnswered(data.answered)
  }

  return (
    <main className="ip">
      <Head title="แบบสอบถาม" />
      <section className="quiz" aria-label="แบบสอบถาม">
        <header>
          <h1>ชอบกิจกรรมนี้แค่ไหน?</h1>
          <p>ตอบตามใจเลย ไม่ต้องคิดว่าเรียนยากไหม หรือรายได้ดีไหม ไม่มีถูกหรือผิด</p>
        </header>
        <div className="card" ref={card}>
          <p id="question" ref={question} className="question" aria-live="polite">
            {item.text}
          </p>
          <LikertScale
            key={item.id}
            name={item.id}
            value={answers[item.id] ?? null}
            onChange={answer}
            labelledBy="question"
          />
        </div>
        <ProgressBar
          value={done}
          max={total}
          label="ตอบแล้ว"
          count={done === total ? 'ครบแล้ว' : `เหลือ ${total - done} ข้อ`}
        />
        <div className="nav">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={idx === 0}
            onClick={() => go(-1)}
          >
            ย้อนกลับ
          </button>
          <span className="spacer" />
          {idx < total - 1 ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!(item.id in answers)}
              onClick={() => go(1)}
            >
              ถัดไป
            </button>
          ) : (
            <Link
              route="student.result"
              className={`btn btn--primary${ready ? ' ready' : ''}`}
              aria-disabled={!ready}
              onClick={(e) => !ready && e.preventDefault()}
            >
              ดูผล
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
