import { test } from '@japa/runner'
import env from '#start/env'

const baseUrl = () => `http://${env.get('HOST')}:${env.get('PORT')}`

/**
 * An Inertia visit: with the `X-Inertia` header the server answers with the
 * page object as JSON. A stale asset version gets a 409 carrying the current
 * version, so retry once with it (https://inertiajs.com/the-protocol).
 */
async function inertiaVisit(path: string, headers: Record<string, string> = {}) {
  const visit = (version = '') =>
    fetch(`${baseUrl()}${path}`, {
      headers: { ...headers, 'X-Inertia': 'true', 'X-Inertia-Version': version },
    })

  let response = await visit()
  if (response.status === 409) {
    response = await visit(response.headers.get('x-inertia-version') ?? '')
  }
  return response
}

test.group('Sticker Lab theme', () => {
  for (const path of ['/login', '/signup']) {
    test(`GET ${path} is light-only: no theme preference shared`, async ({ assert }) => {
      const response = await inertiaVisit(path, { cookie: 'app_theme=dark' })
      const page = (await response.json()) as { props: Record<string, unknown> }

      assert.equal(response.status, 200)
      assert.notProperty(page.props, 'preferences')
    })

    test(`GET ${path} shell loads no theme or Google Fonts`, async ({ assert }) => {
      const response = await fetch(`${baseUrl()}${path}`, {
        headers: { cookie: 'app_theme=dark' },
      })
      const html = await response.text()

      assert.equal(response.status, 200)
      assert.notInclude(html, 'data-theme')
      assert.notInclude(html, 'fonts.googleapis.com')
    })
  }
})
