import { test } from '@japa/runner'
import env from '#start/env'

const baseUrl = () => `http://${env.get('HOST')}:${env.get('PORT')}`

/** Inertia v3 embeds the page object as JSON in a `data-page` script tag. */
function pageProps(html: string) {
  const json = html.match(/<script data-page="app" type="application\/json">(.*?)<\/script>/s)?.[1]
  if (!json) throw new Error('No Inertia page object in HTML')
  return JSON.parse(json).props as Record<string, unknown>
}

test.group('Sticker Lab theme', () => {
  for (const path of ['/login', '/signup']) {
    test(`GET ${path} renders light-only, self-hosted fonts`, async ({ assert }) => {
      const response = await fetch(`${baseUrl()}${path}`, {
        headers: { cookie: 'app_theme=dark' },
      })
      const html = await response.text()

      assert.equal(response.status, 200)
      assert.notInclude(html, 'data-theme')
      assert.notInclude(html, 'fonts.googleapis.com')
      assert.notProperty(pageProps(html), 'preferences')
    })
  }
})
