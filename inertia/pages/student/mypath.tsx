import { Fragment } from 'react'
import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'

type ConsentBlock = Data.Consent['blocks'][number]

/** `**bold**` inside a consent line. */
function Inline({ text }: { text: string }) {
  return text
    .split('**')
    .map((part, i) => <Fragment key={i}>{i % 2 ? <b>{part}</b> : part}</Fragment>)
}

function Block({ block }: { block: ConsentBlock }) {
  if (block.type === 'heading') return <h2>{block.text}</h2>
  if (block.type === 'list')
    return (
      <ul>
        {block.items.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </ul>
    )
  return (
    <p>
      <Inline text={block.text} />
    </p>
  )
}

/**
 * MyPath: optional contact details with a separate, unticked consent box, then Download.
 * Download works either way; without consent the phone and email are discarded.
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
            กดดาวน์โหลดเพื่อเปิดหน้าผลที่พิมพ์หรือบันทึกเป็น PDF ได้ ถ้าอยากให้พี่ ๆ
            ช่วยวางแผนการเรียน ฝากเบอร์หรืออีเมลไว้ได้ (ไม่บังคับ)
          </p>
        </header>
        <Form route="student.mypath.download" className="sheet mypath">
          {({ errors, processing }) => (
            <>
              <fieldset className="consent">
                <legend>ให้พี่ ๆ ติดต่อกลับ (ไม่บังคับ)</legend>
                <div className="field">
                  <label className="field__label" htmlFor="phone">
                    เบอร์โทร
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="field__input"
                    placeholder="0812345678"
                    aria-invalid={errors.phone ? 'true' : 'false'}
                  />
                  {errors.phone && <span className="field__error">{errors.phone}</span>}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="email">
                    อีเมล
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="field__input"
                    placeholder="name@example.com"
                    aria-invalid={errors.email ? 'true' : 'false'}
                  />
                  {errors.email && <span className="field__error">{errors.email}</span>}
                </div>
                <div className="consent-text" tabIndex={0} aria-label="ข้อความขอความยินยอม">
                  {consent.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
                <label className="consent-check">
                  <input type="checkbox" name="consent" defaultChecked={false} />
                  <span>ยินยอมให้ติดต่อกลับตามข้อความด้านบน</span>
                </label>
              </fieldset>

              <div className="download">
                <button type="submit" className="btn btn--primary btn--block" disabled={processing}>
                  {processing ? 'รอสักครู่…' : 'ดาวน์โหลดผลของน้อง'}
                </button>
                <p className="small muted">ดาวน์โหลดได้เสมอ จะติ๊กยินยอมหรือไม่ก็ได้</p>
              </div>
            </>
          )}
        </Form>
      </div>
    </main>
  )
}
