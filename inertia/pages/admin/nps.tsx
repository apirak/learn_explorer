import { Link } from '@adonisjs/inertia/react'
import { urlFor } from '~/client'
import { type Data } from '@generated/data'
import { type InertiaProps } from '~/types'
import Page from '~/components/page'
import AppLayout from '~/layouts/app'

type Group = Data.NpsComment['group']

export const GROUP_LABEL: Record<Group, string> = {
  detractor: 'Detractor (0–6)',
  passive: 'Passive (7–8)',
  promoter: 'Promoter (9–10)',
}

/**
 * NPS comments of the report's cohort, newest first. Free text from students: no code, contact
 * or link to the attempt on this page [DP-001].
 */
export default function AdminNps({
  from,
  to,
  group,
  comments,
}: InertiaProps<{
  from: string
  to: string
  group: Group | null
  comments: {
    data: Data.NpsComment[]
    metadata: { total: number; currentPage: number; lastPage: number }
  }
}>) {
  const { data, metadata } = comments
  const url = (qs: { group?: Group; page?: number }) =>
    urlFor('admin.report.nps', {}, { qs: { from, to, ...qs } })
  const tabs: { label: string; group?: Group }[] = [
    { label: 'ทั้งหมด' },
    ...(Object.keys(GROUP_LABEL) as Group[]).map((g) => ({ label: GROUP_LABEL[g], group: g })),
  ]

  return (
    <Page
      title="NPS comments"
      description={`${metadata.total} ความคิดเห็น · เริ่มทำ${from === to ? `วันที่ ${from}` : `ระหว่าง ${from} ถึง ${to}`}`}
      actions={
        <Link
          href={urlFor('admin.report', {}, { qs: { from, to } })}
          className="btn btn--ghost btn--sm"
        >
          ← Report
        </Link>
      }
    >
      <nav className="nps-groups" aria-label="กลุ่ม">
        {tabs.map((t) => {
          const active = (t.group ?? null) === group
          return (
            <Link
              key={t.label}
              href={url({ group: t.group })}
              className={`btn btn--sm ${active ? 'btn--primary' : 'btn--ghost'}`}
              aria-current={active ? 'page' : undefined}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      <div className="panel records">
        {data.length === 0 ? (
          <p className="muted">ยังไม่มีความคิดเห็นในช่วงนี้</p>
        ) : (
          <table className="records__table">
            <thead>
              <tr>
                <th scope="col">ส่งเมื่อ</th>
                <th scope="col">คะแนน</th>
                <th scope="col">กลุ่ม</th>
                <th scope="col">ความคิดเห็น</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>{c.sentAt && new Date(c.sentAt).toLocaleString('th-TH')}</td>
                  <td>{c.score}</td>
                  <td>{GROUP_LABEL[c.group]}</td>
                  <td className="nps-comments__text">{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {metadata.lastPage > 1 && (
        <nav className="records__pager" aria-label="Pages">
          {metadata.currentPage > 1 && (
            <Link
              href={url({ group: group ?? undefined, page: metadata.currentPage - 1 })}
              className="btn btn--ghost btn--sm"
            >
              Previous
            </Link>
          )}
          <span className="muted">
            Page {metadata.currentPage} of {metadata.lastPage}
          </span>
          {metadata.currentPage < metadata.lastPage && (
            <Link
              href={url({ group: group ?? undefined, page: metadata.currentPage + 1 })}
              className="btn btn--ghost btn--sm"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </Page>
  )
}

AdminNps.layout = [AppLayout]
