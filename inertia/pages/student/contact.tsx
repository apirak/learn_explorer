import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import ContactFields from '~/components/contact_fields'

/**
 * The step between the result and the careers: invites a phone or email, never requires it.
 * Skip stays a visible link, not a hidden one [DP-001: consent is not tied to the service].
 */
export default function StudentContact({ consent }: InertiaProps<{ consent: Data.Consent }>) {
  return (
    <main className="ip result">
      <Head title="ให้พี่ ๆ ช่วยวางแผนต่อ" />
      <div className="result-stack">
        <Link route="student.result" className="back">
          ← กลับ
        </Link>
        <header>
          <h1>ก่อนรู้อาชีพ ขอพี่รู้จักน้องๆ เพิ่มขึ้นก่อน</h1>
          <p className="muted">
            ฝากเบอร์หรืออีเมลไว้ พี่ๆ จะช่วยดูได้ว่าต้องเข้าคณะไหน ใช้คะแนนอะไร
            หรือช่วยวางแผนการเรียนให้ได้ด้วยนะ และข้อมูลอาชีพพี่ๆ จะส่งตามไปให้อีกทีด้วย
          </p>
        </header>
        <Form route="student.contact.store" className="sheet contact-form">
          {({ errors, processing }) => (
            <>
              <ContactFields consent={consent} errors={errors} />
              <div className="download">
                <button type="submit" className="btn btn--primary btn--block" disabled={processing}>
                  {processing ? 'รอสักครู่…' : 'บันทึกแล้วดู 5 อาชีพ →'}
                </button>
                <Link route="student.careers" className="skip">
                  ข้ามไปก่อน ดู 5 อาชีพเลย
                </Link>
              </div>
            </>
          )}
        </Form>
      </div>
    </main>
  )
}
