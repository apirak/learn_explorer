# SheetJS (xlsx) — อ่านไฟล์ Excel ใน backend

Knowledge สำหรับงาน parse ไฟล์ Excel (.xlsx / .xlsm / .xls) ฝั่ง AdonisJS — ตัดสินใจครั้งแรกที่ map [#196](https://github.com/PlanPanda/smart/issues/196) (ticket #197); งานหลักคือแปลง workbook เป็น text part ให้โมเดลอ่าน (spec [#204](https://github.com/PlanPanda/smart/issues/204))

## ⚠️ ห้ามติดตั้งจาก npm registry

npm package `xlsx` **frozen ที่ 0.18.5** (publish ล่าสุด 2022-03-24) และมี CVE 2 ตัวที่ **ไม่มี fix บน npm**:

- **CVE-2023-30533** (GHSA-4r6h-8v6p-xvw6, High 7.8) — prototype pollution, fixed เฉพาะ ≥ 0.19.3 บน CDN
- **CVE-2024-22363** (GHSA-5pgg-2g8v-p4x9, High 7.5) — ReDoS, fixed เฉพาะ ≥ 0.20.2 บน CDN

fix มีอยู่จริง แต่เผยแพร่ **เฉพาะ tarball จาก cdn.sheetjs.com** เท่านั้น (SheetJS Community ย้ายออกจาก npm ตั้งแต่ 0.19)

**ติดตั้งถูกต้อง:**

```bash
pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

`package.json` จะ record เป็น URL tarball (lockfile pin integrity ไว้แล้ว) — **นี่คือ intentional อย่า "แก้"**:

- ห้ามเปลี่ยนเป็น `"xlsx": "^0.18.5"` หรือ `"^0.20.3"` จาก npm — จะกลับไปใช้ build ที่มี CVE ไม่มี fix
- `pnpm outdated` / Renovate / Dependabot อาจ flag เป็น version แปลก ๆ — ข้าม หรือ update ด้วย tarball URL ใหม่จาก CDN เท่านั้น
- อย่าแทนด้วย `node-xlsx` (wrapper ชี้ CDN ให้เองอยู่ดี แต่เติม supply-chain hop) หรือ `@e965/xlsx` (third-party republish) — ใช้ tarball จากเจ้าของโดยตรง

## Read-call shape (ที่ repo ใช้ — adopt ตามนี้)

```ts
import * as XLSX from 'xlsx'

const book = XLSX.read(bytes, { type: 'buffer', dense: true, cellDates: true })
const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name]!, {
  header: 1,      // array-of-arrays; row i = out[i]
  defval: null,   // cell ว่างเป็น null (ความกว้างแถวคงที่)
  blankrows: true,
  raw: true,      // เลข/บูล/Dates — ไม่มี formula text; cached value อยู่ใน v
  UTC: true,      // ← สำคัญ: ไม่ใส่ sheet_to_json จะดึง Date ไป anchor ตาม TZ เครื่อง
})
```

Gotchas ที่วัดด้วยตัวเองแล้ว (2026-10-02):

- **`UTC: true` ต้องใส่ที่ `sheet_to_json`** — `cellDates: true` ที่ `XLSX.read` เพียงพอสำหรับ `XLSX.read` แต่ `sheet_to_json` จะ re-anchor Date ตาม host timezone ถ้าไม่ส่ง `UTC: true` (วัดภายใต้ TZ=Asia/Bangkok)
- **Formula cell ให้ cached number** — `{t:'n', v:2500, f:'A1*A2'}` → โมเดล/serializer เห็น 2500 ไม่เห็น `=`-text; `raw: true` ช่วยไม่ให้แปลงเป็น string
- **ปี พ.ศ. ใน Excel เป็น display format เท่านั้น** — serial เก็บ Gregorian เสมอ (`[569Xl1070000]d/m/yyyy` แสดง 14/2/2569 แต่ข้อมูลคือ 2026-02-14); ห้ามบวก 543 ใน code — ให้โมเดลพูดเป็น พ.ศ. ตาม system prompt (`raw:false` จะ render `"14/2/2026"` สำหรับ cell ฟอร์แมตไทย — ยังเป็น ค.ศ.)
- **ทั้ง SheetJS และ ExcelJS ไม่มี cap zip-bomb/จำนวน cell** — งานที่รับไฟล์จากผู้ใช้ต้องกันเอง: parse ใน worker thread + timeout + cap แถว/ตัวอักษร (ดู spec ของ AI chat attachment)

## ทางเลือกที่ตัดสินใจแล้ว

- **ExcelJS** — MIT, CVE-clean แต่ dormant (v4.4.0 ปี 2023, repo หยุด 2025-01) และอ่านแค่ XLSX/CSV (ไม่มี .xls/.xlsb/ODS)
- **`node-xlsx` / `@e965/xlsx`** — wrapper/republish ของ SheetJS เอง → เพิ่ม hop โดยไม่ได้อะไร
- **`read-excel-file`** — อ่านได้แค่ .xlsx และ **drop formula cell ที่ compute error เงียบ ๆ**
