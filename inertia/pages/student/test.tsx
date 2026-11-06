import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { client } from '~/client'
import LikertScale from '~/components/ui/likert_scale'
import ProgressBar from '~/components/ui/progress_bar'

type Item = { id: string; text: string }

export default function StudentTest({
  items,
  answers: saved,
}: {
  items: Item[]
  answers: Record<string, number>
}) {
  const [answers, setAnswers] = useState(saved)
  // Refresh resumes at the first unanswered question.
  const [idx, setIdx] = useState(() => {
    const open = items.findIndex((it) => !(it.id in saved))
    return open === -1 ? items.length - 1 : open
  })
  const item = items[idx]
  const done = items.filter((it) => it.id in answers).length

  // ponytail: one send per tap, failures only logged; the retry queue is #7.
  async function answer(value: number) {
    setAnswers((a) => ({ ...a, [item.id]: value }))
    if (idx < items.length - 1) setIdx(idx + 1) // next question right away
    const [, error] = await client.api.student.test
      .answer({ body: { itemId: item.id, value } })
      .safe()
    if (error) console.error('answer not saved', item.id, error.status ?? error.kind)
  }

  return (
    <main className="page student">
      <Head title="แบบสอบถาม" />
      <h1 className="page__title">ชอบกิจกรรมนี้แค่ไหน?</h1>
      <p className="page__description">
        ตอบตามใจเลย ไม่ต้องคิดว่าเรียนยากไหม หรือรายได้ดีไหม ไม่มีถูกหรือผิด
      </p>

      <section className="panel student__card">
        <p id="question" className="student__question" aria-live="polite">
          {item.text}
        </p>
        <LikertScale
          key={item.id}
          name={item.id}
          value={answers[item.id] ?? null}
          onChange={answer}
          labelledBy="question"
        />
      </section>

      <ProgressBar value={done} max={items.length} label="ตอบแล้ว" />

      <div className="student__nav">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
        >
          ย้อนกลับ
        </button>
        {idx < items.length - 1 && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={!(item.id in answers)}
            onClick={() => setIdx(idx + 1)}
          >
            ถัดไป
          </button>
        )}
      </div>
    </main>
  )
}
