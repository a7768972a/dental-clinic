# دليل حل مشاكل Vercel + Supabase + Prisma

## ملخص سريع
هذا الدليل يوثق جميع المشاكل التي واجهتنا عند نشر تطبيق Next.js على Vercel مع Supabase PostgreSQL وكيف حللناها.

---

## 🚨 المشاكل وحلولها

### 1. خطأ GitHub Committer Association
**المشكلة:**
```
The committer email is not associated with any GitHub account
Deployment Blocked
```

**الحل:**
```bash
git config user.email "your-email@users.noreply.github.com"
git config user.name "your-username"
```

---

### 2. خطأ Build Timeout (45 دقيقة)
**المشكلة:**
```
Build timed out after 45 minutes
```

**السبب:** أمر `prisma db push` في build script يستغرق وقت طويل

**الحل:**
- إزالة `prisma db push` من build command
- إنشاء الجداول يدوياً في Supabase أو استخدام `prisma migrate deploy`
- في `vercel.json`:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

---

### 3. خطأ Password Encoding
**المشكلة:**
```
Error parsing database URL
```

**السبب:** رمز `@` في كلمة المرور يربط URL parser

**الحل:** استبدل `@` بـ `%40` في كلمة المرور
```
# خطأ
postgresql://user:p@ssword@host:5432/db

# صحيح
postgresql://user:p%40ssword@host:5432/db
```

---

### 4. خطأ Can't Reach Database
**المشكلة:**
```
Can't reach database server at `db.xxx.supabase.co:5432`
```

**السبب:** Vercel serverless لا يعمل مع Direct Connection (port 5432)

**الحل:** استخدم Transaction Pooler (port 6543)

**من Supabase Dashboard:**
1. اذهب إلى Project Settings → Database
2. ابحث عن "Connection Pooling"
3. انسخ "Transaction Pooler" URL

---

### 5. خطأ Prepared Statements (الأهم!)
**المشكلة:**
```
Error: prepared statement "s27" already exists (code: 42P05)
Error: prepared statement "s26" does not exist (code: 26000)
```

**السبب:** PgBouncer Transaction Mode يعيد استخدام الاتصالات مع حالات prepared statements مختلفة

**الحل - ملف `src/lib/db.ts`:**
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

**الحل - ملف `prisma/schema.prisma`:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

**مهم:** لا تستخدم `__internal` configurations أو `relationMode = "prisma"`

---

## ⚙️ Environment Variables الصحيحة

### في Vercel Dashboard:

```bash
# للاتصال العادي (Pooler)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# للـ Migrations (Direct)
DIRECT_DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### ملاحظات مهمة:
- ✅ استخدم `pgbouncer=true` في DATABASE_URL
- ✅ استخدم `connection_limit=1` لـ serverless
- ❌ لا تستخدم `prepared_statements=false` (قد يسبب مشاكل)
- ❌ لا تستخدم Direct Connection للـ DATABASE_URL

---

## 🔧 هيكل الملفات الصحيح

### `vercel.json`
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "bun install",
  "framework": "nextjs"
}
```

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

// Models...
```

### `src/lib/db.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

---

## 📋 Checklist قبل النشر

- [ ] كلمة المرور مُشفرة (`%40` بدل `@`)
- [ ] DATABASE_URL يستخدم Transaction Pooler (port 6543)
- [ ] DIRECT_DATABASE_URL يستخدم Direct Connection (port 5432)
- [ ] `pgbouncer=true` و `connection_limit=1` في DATABASE_URL
- [ ] لا يوجد `prepared_statements=false`
- [ ] `vercel.json` بدون `prisma db push`
- [ ] `db.ts` مبسط بدون `__internal` configs
- [ ] `schema.prisma` بدون `relationMode = "prisma"`

---

## 🔗 روابط مفيدة

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Vercel with Prisma](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

---

## 📝 ملاحظات إضافية

### n8n Integration
- يمكن ربط n8n مع نفس قاعدة بيانات Supabase
- استخدم نفس Connection String مع Direct Connection للـ n8n
- أو استخدم Supabase REST API

### مراقبة الأخطاء
- استخدم Vercel Dashboard → Logs لمراقبة أخطاء Runtime
- استخدم Supabase Dashboard → Logs لمراقبة اتصالات قاعدة البيانات

---

**آخر تحديث:** April 2025
**المشروع:** Dental Clinic Management System
