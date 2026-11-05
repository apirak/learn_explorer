# Vercel EVE knowledge

เอกสารอ้างอิงแบบ Markdown ที่ดาวน์โหลดจาก [eve.dev/docs](https://eve.dev/docs) เมื่อ 28 ต.ค. 2569 เพื่อใช้วางแผนและพัฒนา EVE ใน SolidPlan โดยไม่ต้องเปิดเว็บใหม่ทุกครั้ง

## อ่านตามงาน

| งาน | เริ่มอ่าน | ใช้กับ SolidPlan |
| --- | --- | --- |
| เริ่มโปรเจกต์และโครงสร้างไฟล์ | [getting-started.md](getting-started.md), [project-structure.md](project-structure.md) | วาง `agent/` แยกจาก AdonisJS และกำหนดขอบเขต migration |
| เปลี่ยน custom AI loop เป็น EVE | [default-harness.md](default-harness.md), [execution-model-and-durability.md](execution-model-and-durability.md) | แทน orchestration/compaction ใน `AiChatService` โดยยังคง conversation และ billing ของ SolidPlan |
| ย้าย system prompt | [instructions.md](instructions.md) | แยก prompt คงที่ออกจากโค้ดและรองรับ dynamic instructions |
| ย้าย workflow เป็นไฟล์ | [skills.md](skills.md), [context-control.md](context-control.md) | แทน/เชื่อมกับ `SkillCatalogService` และ `load_skill` |
| เครื่องมือและการค้นหาเครื่องมือ | [tools.md](tools.md), [built-in-tools.md](built-in-tools.md) | ประเมินการแทน `load_tools`, tool catalog และ tool result context |
| ต่อ SolidPlan MCP | [connections.md](connections.md), [mcp-connections.md](mcp-connections.md) | เชื่อม EVE เข้ากับ customer/activity/policy tools โดยให้ AdonisJS เป็น authorization boundary |
| user/tenant-specific capability | [dynamic-capabilities.md](dynamic-capabilities.md) | เลือก tools, skills, model และ connection ตาม agent, organization และ feature flags |
| memory | [memory.md](memory.md), [multi-tenant-memory.md](multi-tenant-memory.md) | ออกแบบ memory scoped ด้วย organization + user; ห้ามเริ่มจาก remember-all |
| deploy และ production boundary | [deployment.md](deployment.md) | ตรวจ Node/runtime/secrets/route auth ก่อนแยก EVE เป็น service |

## SolidPlan-specific reading order

1. `default-harness.md` — ระบุสิ่งที่ EVE แทนได้
2. `mcp-connections.md` — ตรวจวิธีเชื่อม MCP ที่มีอยู่แล้ว
3. `dynamic-capabilities.md` — เทียบกับ per-agent auth และ MCP flags
4. `memory.md` และ `multi-tenant-memory.md` — ตัดสินใจ ownership และ tenant isolation
5. `execution-model-and-durability.md` — ตรวจผลต่อ conversation persistence, deployment และ rollback
6. `deployment.md` — ตรวจความเข้ากันได้กับ AdonisJS/Node และ production topology

## สิ่งที่ EVE ไม่ควรเป็นเจ้าของ

- customer, activity, policy และ document data
- MCP OAuth, authorization, capability flags และ tenant access checks
- SolidPlan wallet, AI usage charging, audit records และ deletion policy
- attachment staging, customer-document storage และ product chat UI

## Source / refresh

ไฟล์เหล่านี้เป็น snapshot สำหรับ reference ไม่ใช่ source of truth ถ้า EVE เปลี่ยน API หรือ behavior ให้ตรวจเอกสารออนไลน์ก่อนแก้ implementation
