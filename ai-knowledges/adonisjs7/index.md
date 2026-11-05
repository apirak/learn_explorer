# AdonisJS 7 Knowledge Index

ใช้ index นี้เพื่อเลือกอ่านเฉพาะไฟล์ที่เกี่ยวข้องกับงาน ไม่ต้องอ่านทั้งโฟลเดอร์

## เริ่มต้น / โครงสร้างโปรเจกต์

| หัวข้อ | ไฟล์ |
| --- | --- |
| ตั้งค่า environment สำหรับพัฒนา | [environment_setup.md](environment_setup.md) |
| โครงสร้างโฟลเดอร์และบทบาทของแต่ละส่วน | [folder_structure.md](folder_structure.md) |

## Routing / Controller / Middleware

| หัวข้อ | ไฟล์ |
| --- | --- |
| Routing พื้นฐาน | [routing.md](routing.md) |
| Controllers | [controller.md](controller.md) |
| CORS | [cors.md](cors.md) |
| Type-safe URL builder | [routing.md](routing.md) |

## Database / Model

| หัวข้อ | ไฟล์ |
| --- | --- |
| Database, Models, Migrations, Relationships, Factories (tutorial) | [database_and_model.md](database_and_model.md) |
| Lucid ORM อย่างละเอียด (official guide) | [lucid_sql_orm.md](lucid_sql_orm.md) |
| Transformers และการ serialize ข้อมูล | [transformers.md](transformers.md) |

## Authentication / Authorization

| หัวข้อ | ไฟล์ |
| --- | --- |
| Session guard (ล็อกอินด้วย session) | [session_guard.md](session_guard.md) |
| ตรวจสอบ user credentials | [verify_user_credentials.md](verify_user_credentials.md) |
| Social authentication (Ally) | [authentication_social.md](authentication_social.md) |
| Authorization ด้วย Bouncer policies | [authentication.md](authentication.md) |

## Frontend / Rendering

| หัวข้อ | ไฟล์ |
| --- | --- |
| Edge templates (SSR) | [edgejs.md](edgejs.md) |
| Inertia + React/Vue | [inertia.md](inertia.md) |
| Vite integration / asset bundling | [vite.md](vite.md) |
| ปกป้อง SSR app ด้วย Shield | [secure_ssr_app.md](secure_ssr_app.md) |

## Type-safe API

| หัวข้อ | ไฟล์ |
| --- | --- |
| Tuyau type-safe API client | [type-safe-api.md](type-safe-api.md) |

## ระบบสนับสนุน

| หัวข้อ | ไฟล์ |
| --- | --- |
| ส่งอีเมล (@adonisjs/mail) | [mail.md](mail.md) |
| จัดการไฟล์อัปโหลด (Drive) | [drive.md](drive.md) |
| Logger | [logger.md](logger.md) |
| Queues / background jobs | [queues.md](queues.md) |
| Real-time ด้วย Transmit (SSE) | [transmit.md](transmit.md) |
| Redis | [redis.md](redis.md) |
| Health checks | [health_check.md](health_check.md) |
| Ace commands reference | [command.md](command.md) |

## Testing

| หัวข้อ | ไฟล์ |
| --- | --- |
| แนะนำการ test ด้วย Japa | [test.md](test.md) |
| Reset state ระหว่าง tests | [reset-state-between-test.md](reset-state-between-test.md) |
| API tests | [test-api.md](test-api.md) |
| Console tests (Ace commands) | [test-console.md](test-console.md) |
