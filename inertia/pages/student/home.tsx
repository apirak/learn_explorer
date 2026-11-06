import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import Attribution from '~/components/ui/attribution'

export default function StudentHome({
  resume,
  attribution,
}: {
  resume: { answered: number; total: number } | null
  attribution: string
}) {
  return (
    <main className="page student">
      <Head title="อาชีพที่ฝันไว้ จะตรงกับสิ่งที่ชอบไหม?" />
      <h1 className="page__title">อาชีพที่ฝันไว้ จะตรงกับสิ่งที่ชอบไหม?</h1>
      <p className="page__description">
        ลองบอกอาชีพที่อยากเป็น แล้วตอบคำถาม เพื่อดูว่า ความสนใจของเราพาไปทางไหน
      </p>

      {resume && (
        <section className="panel student__resume" aria-label="ทำค้างไว้">
          <p>
            ทำค้างไว้ {resume.answered}/{resume.total} ข้อ
          </p>
          <div className="page__actions">
            <Link route="student.test.show" className="btn btn--primary">
              ทำต่อ
            </Link>
            <Form route="student.start">
              <button type="submit" className="btn btn--secondary">
                เริ่มใหม่
              </button>
            </Form>
          </div>
        </section>
      )}

      <Form route="student.start" className="panel student__form">
        {({ processing }) => (
          <>
            <div className="field">
              <label className="field__label" htmlFor="desiredCareer">
                ตอนนี้อยากเป็นอะไร?
              </label>
              <input
                id="desiredCareer"
                name="desiredCareer"
                type="text"
                maxLength={100}
                autoComplete="off"
                className="field__input"
                placeholder="เช่น นักพัฒนาเกม, หมอ…"
              />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={processing}>
              ลองดูว่าเราเหมาะกับสายไหน <span aria-hidden="true">→</span>
            </button>
            <p className="field__hint">ไม่ใช่การตัดสินอนาคต แค่ลองรู้จักตัวเองให้มากขึ้น</p>
          </>
        )}
      </Form>

      <Attribution text={attribution} />
    </main>
  )
}
