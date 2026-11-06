import { useRef, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { type InertiaProps } from '~/types'
import { LikertFace } from '~/components/ui/likert_scale'

/** The dream card shows this until the student types a career. */
const DREAM_EXAMPLE = 'นักพัฒนาเกม'

export default function StudentHome({
  resume,
}: InertiaProps<{
  resume: { answered: number; total: number } | null
}>) {
  const [guess, setGuess] = useState('')
  const input = useRef<HTMLInputElement>(null)

  return (
    <main className="ip ip--wide">
      <Head title="อาชีพที่ฝันไว้ จะตรงกับสิ่งที่ชอบไหม?" />
      <section className="sticker">
        <div className="pitch">
          <div className="topline">
            <span className="badge">ต้นแบบ · ยังไม่ผ่านการทดสอบ</span>
          </div>
          <h1 className="headline">
            <span className="dash dash-l" aria-hidden="true" />
            <mark className="hl lime">อาชีพที่ฝันไว้</mark>
            <br />
            จะตรงกับ
            <br />
            <mark className="hl purple">สิ่งที่ชอบไหม?</mark>
            <span className="dash dash-r" aria-hidden="true" />
          </h1>
          <p className="lede">
            ลองบอกอาชีพที่อยากเป็น แล้วตอบคำถาม
            <br />
            เพื่อดูว่า ความสนใจของเราพาไปทางไหน
          </p>
          <svg className="squiggle" viewBox="0 0 240 12" aria-hidden="true">
            <path d="M2 6q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0" />
          </svg>

          {resume && (
            <div className="ask resume">
              <span className="label">
                ทำค้างไว้ {resume.answered}/{resume.total} ข้อ
              </span>
              <Link route="student.test.show" className="go">
                ทำต่อ <span aria-hidden="true">→</span>
              </Link>
              <Form route="student.start" className="ask">
                <button type="submit" className="explore">
                  เริ่มใหม่
                </button>
              </Form>
            </div>
          )}

          <Form route="student.start" className="ask">
            <label htmlFor="guess" className="label">
              ตอนนี้อยากเป็นอะไร?
            </label>
            <div className="entry">
              <input
                ref={input}
                id="guess"
                name="desiredCareer"
                type="text"
                maxLength={100}
                autoComplete="off"
                placeholder="เช่น นักพัฒนาเกม, หมอ…"
                onChange={(e) => setGuess(e.target.value)}
              />
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />
              </svg>
            </div>
            <button className="go" type="submit">
              ลองดูว่าเราเหมาะกับสายไหน <span aria-hidden="true">→</span>
            </button>
            <p className="fine">ไม่ใช่การตัดสินอนาคต แค่ลองรู้จักตัวเองให้มากขึ้น</p>
            {/* Starts without a guess: the click clears the field before the form is read. */}
            <button
              className="explore"
              type="submit"
              onClick={() => {
                input.current!.value = ''
                setGuess('')
              }}
            >
              ยังไม่มีอาชีพในใจ? ลองสำรวจได้เลย
            </button>
          </Form>
        </div>

        <aside className="board" aria-hidden="true">
          <p className="board-title">
            <mark className="hl lime">เริ่มจากสิ่งที่ฝัน</mark>
            <br />
            <mark className="hl lime">แล้วสำรวจสิ่งที่ชอบ</mark>
          </p>
          <div className="sticky dream">
            <span className="label">อาชีพในใจ</span>
            <span className="emoji big">🎮</span>
            <b className="dream-name">{guess.trim() || DREAM_EXAMPLE}</b>
          </div>
          <div className="sticky like">
            <span className="label">ความสนใจของเรา</span>
            <div className="faces">
              {[0, 1, 2, 3, 4].map((v) => (
                <LikertFace key={v} value={v} />
              ))}
            </div>
            <div className="props">
              <span className="emoji">💻</span>
              <span className="emoji">🎧</span>
              <span className="emoji">📚</span>
              <span className="emoji">🧪</span>
            </div>
          </div>
        </aside>
      </section>

      <footer className="ip-credits">
        <p>
          ข้อคำถามดัดแปลงจาก O*NET Interest Profiler Short Form และ Mini Interest Profiler (Mini-IP)
          และข้อมูลอาชีพจาก O*NET 31.0 Database โดย U.S. Department of Labor, Employment and
          Training Administration (USDOL/ETA) ใช้ภายใต้{' '}
          <a href="https://www.onetcenter.org/license_tools.html">O*NET Tools Developer License</a>{' '}
          และ <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> OnDemand
          ได้แปลและดัดแปลงข้อมูลบางส่วน USDOL/ETA ไม่ได้อนุมัติ รับรอง หรือทดสอบการดัดแปลงนี้ O*NET®
          เป็นเครื่องหมายการค้าของ USDOL/ETA
        </p>
      </footer>
    </main>
  )
}
