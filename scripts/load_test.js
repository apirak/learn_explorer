/**
 * Load test: N students (default 400) ramping up over 10 s against a LOCAL production build.
 * Plain Node 24 (`fetch`), no new dependency. Each student opens `/?code=LOADTEST`, starts,
 * sends the 30 Mini-IP answers at random 1–4 s intervals, then opens `/result`.
 * It reports p50/p95 latency and errors, then checks the DB holds 30 answers per attempt.
 *
 *   node ace build && cd build && pnpm i --prod && node bin/server.js   # NODE_ENV=production
 *   pnpm test:load [students=400] [baseUrl=http://localhost:3333]
 *
 * It refuses any host but localhost, for the server and the database: never production.
 * The LOADTEST attempts stay in the local DB.
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'

const STUDENTS = Number(process.argv[2] ?? 400)
const BASE = process.argv[3] ?? 'http://localhost:3333'
const RAMP_MS = 10_000
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

process.loadEnvFile('.env')
if (!LOCAL.has(new URL(BASE).hostname) || !LOCAL.has(process.env.DB_HOST ?? '')) {
  console.error('Refusing: the load test runs against localhost only.')
  process.exit(1)
}

const ids = JSON.parse(readFileSync('content/v1/items_th.json', 'utf8')).forms.mini.ids
const latencies = []
const errors = { server: 0, other: 0 }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** One student's browser: a cookie jar, and the XSRF header Inertia and Tuyau send. */
function browser() {
  const jar = new Map()
  return async (method, path, { json, expect } = {}) => {
    const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }
    if (jar.has('XSRF-TOKEN')) headers['x-xsrf-token'] = decodeURIComponent(jar.get('XSRF-TOKEN'))
    if (json) headers['content-type'] = 'application/json'
    const started = performance.now()
    let res
    try {
      res = await fetch(BASE + path, {
        method,
        headers,
        body: json && JSON.stringify(json),
        redirect: 'manual',
      })
      await res.arrayBuffer()
    } catch {
      errors.other++
      return null
    }
    latencies.push(performance.now() - started)
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';')
      const at = pair.indexOf('=')
      jar.set(pair.slice(0, at), pair.slice(at + 1))
    }
    if (res.status >= 500) errors.server++
    else if (expect && res.status !== expect) errors.other++
    return res
  }
}

async function student() {
  const request = browser()
  await request('GET', '/?code=LOADTEST', { expect: 302 })
  await request('GET', '/', { expect: 200 })
  await request('POST', '/attempts', { json: {}, expect: 302 })
  for (const itemId of ids) {
    await sleep(1000 + Math.random() * 3000)
    await request('POST', '/test/answers', {
      json: { itemId, value: Math.floor(Math.random() * 5) },
      expect: 200,
    })
  }
  await request('GET', '/result', { expect: 200 })
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]

const startedAt = new Date()
console.log(`${STUDENTS} students over ${RAMP_MS / 1000} s against ${BASE}…`)
await Promise.all(
  Array.from({ length: STUDENTS }, async (_, i) => {
    await sleep((RAMP_MS * i) / STUDENTS)
    await student()
  })
)

const sorted = latencies.sort((a, b) => a - b)
console.log(
  `requests ${sorted.length}, p50 ${percentile(sorted, 0.5).toFixed(0)} ms, ` +
    `p95 ${percentile(sorted, 0.95).toFixed(0)} ms, ` +
    `5xx ${errors.server}, other errors ${errors.other}`
)

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
})
await client.connect()
const { rows } = await client.query(
  `select a.id, count(an.id)::int as answers from attempts a
   left join answers an on an.attempt_id = a.id
   where a.code = 'LOADTEST' and a.created_at >= $1 group by a.id`,
  [startedAt]
)
await client.end()

const lost = STUDENTS * ids.length - rows.reduce((sum, r) => sum + r.answers, 0)
const short = rows.filter((r) => r.answers !== ids.length).length
console.log(`attempts ${rows.length}/${STUDENTS}, short attempts ${short}, lost answers ${lost}`)

const ok = errors.server === 0 && errors.other === 0 && lost === 0 && rows.length === STUDENTS
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
