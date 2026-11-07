import { Fragment } from 'react'
import { type Data } from '@generated/data'

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
 * Optional phone and email, the consent text folded under a link, and an unticked box.
 * Used inside a `<Form>`.
 */
export default function ContactFields({
  consent,
  errors,
}: {
  consent: Data.Consent
  errors: Record<string, string | undefined>
}) {
  return (
    <fieldset className="consent">
      <legend>ให้เราได้รู้จักกัน (ไม่บังคับ)</legend>
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
      <details className="consent-details">
        <summary>ดูรายละเอียดข้อกฎหมาย</summary>
        <div className="consent-text" tabIndex={0} aria-label="ข้อความขอความยินยอม">
          {consent.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </details>
      <label className="consent-check">
        <input
          type="checkbox"
          name="consent"
          defaultChecked={false}
          aria-invalid={errors.consent ? 'true' : 'false'}
        />
        <span>ยินดีให้พี่ๆ ติดต่อกลับ</span>
      </label>
      {errors.consent && <span className="field__error">{errors.consent}</span>}
    </fieldset>
  )
}
