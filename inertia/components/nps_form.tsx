import { useId, useState } from 'react'
import { client } from '~/client'
import { LikertFace } from '~/components/ui/likert_scale'

/** Follow-up question per standard NPS band: 0–6 Detractor, 7–8 Passive, 9–10 Promoter. */
const followUp = (score: number) =>
  score <= 6 ? 'ตรงไหนที่ยังไม่โดนใจ?' : score <= 8 ? 'ปรับอะไรถึงจะได้ 10?' : 'ชอบตรงไหนที่สุด?'

/** NPS band of a score, which also picks the face's reaction. */
const band = (score: number) => (score <= 6 ? 'low' : score <= 8 ? 'mid' : 'high')

/** The five answer faces, stretched over 0–10. */
const face = (score: number) =>
  score <= 2 ? 0 : score <= 4 ? 1 : score <= 6 ? 2 : score <= 8 ? 3 : 4

const COMMENT_MAX = 500

/**
 * NPS response on the careers page. A tap saves the score without waiting (a lost request only
 * costs the stat); ส่ง sends the optional comment and swaps the form for thanks. The comment is
 * free text from a minor: the box asks for no name or phone [DP-001].
 */
export default function NpsForm({ initial }: { initial: { score: number; sent: boolean } | null }) {
  const id = useId()
  const [score, setScore] = useState<number | null>(initial?.score ?? null)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(initial?.sent ?? false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  if (sent) {
    return (
      <section className="sheet nps nps--thanks" aria-live="polite">
        <p className="nps__thanks">ขอบคุณนะ! 💛</p>
      </section>
    )
  }

  const pick = (n: number) => {
    setScore(n)
    void client.api.student.nps.store({ body: { score: n } }).safe()
  }

  const send = async () => {
    if (score === null) return
    setSending(true)
    setFailed(false)
    const [, error] = await client.api.student.nps
      .store({ body: { score, comment, send: true } })
      .safe()
    setSending(false)
    if (error) setFailed(true)
    else setSent(true)
  }

  return (
    <section className="sheet nps" aria-labelledby={`${id}-q`}>
      <div className="nps__q">
        {/* Keyed by face, so each new face is slapped on fresh and reacts to its band. */}
        <span
          key={score === null ? 'idle' : face(score)}
          className={'nps__face' + (score === null ? ' is-idle' : '')}
          data-band={score === null ? undefined : band(score)}
        >
          <LikertFace value={score === null ? 2 : face(score)} />
        </span>
        <h2 id={`${id}-q`}>อยากชวนเพื่อนมาลองแบบทดสอบนี้แค่ไหน?</h2>
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-q`} className="nps__scale">
        {Array.from({ length: 11 }, (_, n) => (
          <label key={n} className="nps__n">
            <input
              type="radio"
              name={`${id}-score`}
              value={n}
              checked={score === n}
              onChange={() => pick(n)}
              className="nps__input"
            />
            {n}
          </label>
        ))}
      </div>
      <div className="nps__ends small muted" aria-hidden>
        <span>ไม่ชวนเลย</span>
        <span>ชวนแน่นอน!</span>
      </div>
      {score !== null && (
        <div className="nps__follow">
          <label key={band(score)} className="field__label nps__ask" htmlFor={`${id}-comment`}>
            {followUp(score)}
          </label>
          <textarea
            id={`${id}-comment`}
            className="nps__text"
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="ไม่ต้องใส่ชื่อหรือเบอร์นะ"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="nps__send">
            <span className="small muted">
              {comment.length}/{COMMENT_MAX}
            </span>
            <button type="button" className="btn btn--sm" disabled={sending} onClick={send}>
              ส่ง
            </button>
          </div>
          {failed && (
            <p className="small nps__error" role="alert">
              ส่งไม่สำเร็จ ลองกดส่งอีกครั้งนะ
            </p>
          )}
        </div>
      )}
    </section>
  )
}
