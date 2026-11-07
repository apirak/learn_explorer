import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import ContactFields from '~/components/contact_fields'

/**
 * MyPath: optional contact details with a separate, unticked consent box, then Download.
 * A typed phone or email needs the box ticked. With a contact already left, `/mypath` skips
 * straight to the printable page.
 */
export default function StudentMypath({ consent }: InertiaProps<{ consent: Data.Consent }>) {
  return (
    <main className="ip result">
      <Head title="เส้นทางของน้อง" />
      <div className="result-stack">
        <Link route="student.careers" className="back">
          ← กลับ
        </Link>
        <header>
          <h1>เก็บผลไว้ดูทีหลัง</h1>
          <p className="muted">
            กดปุ่มด้านล่างเพื่อเปิดหน้าผลที่พิมพ์หรือบันทึกเป็น PDF ได้ ถ้าอยากให้พี่ ๆ
            ช่วยวางแผนการเรียน ฝากเบอร์หรืออีเมลไว้ได้ (ไม่บังคับ)
          </p>
        </header>
        <Form route="student.mypath.download" className="sheet mypath">
          {({ errors, processing }) => (
            <>
              <ContactFields consent={consent} errors={errors} />

              <div className="download">
                <button type="submit" className="btn btn--primary btn--block" disabled={processing}>
                  {processing ? 'รอสักครู่…' : 'เปิดหน้าพิมพ์ / บันทึก PDF'}
                </button>
                <p className="small muted">ไม่กรอกก็เปิดได้ ถ้ากรอกต้องติ๊กยินยอมด้วย</p>
              </div>
            </>
          )}
        </Form>
      </div>
    </main>
  )
}
