import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { client } from '~/client'
import { type InertiaProps } from '~/types'
import LikertScale from '~/components/ui/likert_scale'
import ProgressBar from '~/components/ui/progress_bar'
import AnswerQueue, { NOTICE_AFTER, type Outcome } from '~/answer_queue'

type Item = { id: string; text: string; type: string }

async function sendAnswer(itemId: string, value: number): Promise<Outcome> {
  const [data, error] = await client.api.student.test.answer({ body: { itemId, value } }).safe()
  if (!error) return data
  return error.kind === 'network' ? 'network' : { status: error.status ?? 0 }
}

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
  attemptId,
  items,
  answers: saved,
  total,
}: InertiaProps<{
  attemptId: string
  items: Item[]
  answers: Record<string, number>
  total: number
}>) {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [queue] = useState(() => new AnswerQueue(attemptId, sessionStorage, sendAnswer, rerender))
  // Answers this tab has not sent yet (kept across a reload) win over the server's copy.
  const [answers, setAnswers] = useState(() => ({ ...saved, ...Object.fromEntries(queue.pending) }))
  const serverAnswered = queue.answered ?? Object.keys(saved).length
  // Refresh resumes at the first unanswered question; "กลับไปทบทวน" (?review) starts at 1.
  const review = new URLSearchParams(usePage().url.split('?')[1]).has('review')
  const [idx, setIdx] = useState(() => {
    const open = items.findIndex((it) => !(it.id in saved))
    if (open !== -1) return open
    return review ? 0 : items.length - 1
  })
  const question = useRef<HTMLParagraphElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const step = useRef<{ oldText: string; dir: number } | null>(null)

  useEffect(() => {
    const flush = () => void queue.flush()
    flush()
    addEventListener('online', flush)
    return () => {
      removeEventListener('online', flush)
      queue.stop()
    }
  }, [queue])

  const item = items[idx]
  const done = items.filter((it) => it.id in answers).length
  // "ดูผล" waits for the server to hold every answer, not just this browser.
  const ready = done === total && serverAnswered === total && queue.pending.size === 0

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

  function answer(value: number) {
    setAnswers((a) => ({ ...a, [item.id]: value }))
    if (idx < total - 1) {
      const face = card.current!.querySelectorAll('.likert__face')[value]
      flyToBar(face, card.current!.parentElement!.querySelector('.progress__bar')!)
      go(1) // no delay: next question right away
    }
    queue.put(item.id, value)
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
        {queue.rejected ? (
          <button
            type="button"
            className="btn btn--secondary save-notice"
            role="alert"
            onClick={() => location.reload()}
          >
            บันทึกบางข้อไม่สำเร็จ แตะเพื่อโหลดหน้าใหม่
          </button>
        ) : queue.failures >= NOTICE_AFTER ? (
          <button
            type="button"
            className="btn btn--secondary save-notice"
            role="alert"
            onClick={() => void queue.flush()}
          >
            บันทึกไม่สำเร็จ แตะเพื่อลองใหม่
          </button>
        ) : null}
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
