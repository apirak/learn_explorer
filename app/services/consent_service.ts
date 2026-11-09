import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'

/**
 * The consent text students see on Print prep: the file `resources/consent/<CONSENT_VERSION>.th.md`.
 * Stored with every consent [N2]. Before launch, add Legal's verbatim text as a new file and
 * point this at it. `tests/unit/consent.spec.ts` blocks release while it names a placeholder.
 */
export const CONSENT_VERSION = 'placeholder-2026-11'

export type ConsentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

/**
 * The small Markdown subset the consent files use: `### ` headings, `- ` lists, paragraphs
 * and `**bold**` (left inline for the page). HTML comments are author notes and are dropped.
 */
export function parseConsent(markdown: string): ConsentBlock[] {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): ConsentBlock => {
      const lines = block.split('\n').map((l) => l.trim())
      if (lines.every((l) => l.startsWith('- '))) {
        return { type: 'list', items: lines.map((l) => l.slice(2)) }
      }
      if (block.startsWith('#')) return { type: 'heading', text: block.replace(/^#+\s*/, '') }
      return { type: 'paragraph', text: lines.join(' ') }
    })
}

const markdown = await readFile(
  app.makePath('resources/consent', `${CONSENT_VERSION}.th.md`),
  'utf8'
)

export class ConsentService {
  readonly version = CONSENT_VERSION
  readonly blocks = parseConsent(markdown)
}

export default new ConsentService()
