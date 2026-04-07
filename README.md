<div align="center">

# 🦷 Dental OS

### نظام إدارة عيادة الأسنان المتكامل

نظام شامل لإدارة عيادة الأسنان مصمم خصيصاً للدكتور بشار عابدين
يدعم اللغة العربية بالكامل مع وضع مظلم/فاتح

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)](https://prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=black)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)](https://vercel.com)

</div>

---

## ✨ المميزات

### 📅 إدارة المواعيد
- جدولة مواعيد مع عرض شهرية / أسبوعية / يومية / قائمة
- سحب وإفلات لتعديل المواعيد
- تذكيرات آلية للمرضى عبر WhatsApp
- حالات متعددة: مجدول، مؤكد، مكتمل، ملغي

### 👥 إدارة المرضى
- سجلات شاملة للمرضى (الاسم، الهاتف، التاريخ الطبي، الحساسية)
- **مخطط أسنان تفاعلي** — 32 سن بـ FDI notation مع حالات متعددة
- بحث سريع بالاسم أو رقم الهاتف

### 💰 الفواتير والمحاسبة
- إنشاء فواتير مع عناصر متعددة
- خصومات وضرائب
- طرق دفع متعددة (نقدي، بطاقة، تحويل)
- **خطط تقسيط** مع متابعة الأقساط الشهرية
- تقارير مالية شاملة (إيرادات، مصاريف، صافي ربح)

### 📋 قائمة الانتظار
- شاشة عرض كبيرة لصالة الانتظار
- حالات: وصل، بانتظار، مع الطبيب، مكتمل
- أولوية (عادي، عاجل، طوارئ)

### 🦷 مخطط الأسنان
- عرض تفاعلي لجميع الأسنان (32 سن)
- حالات: سليم، تسوس، حشو، زراعة، خلع، تاج، علاج عصب
- ألوان مميزة لكل حالة
- ملاحظات على كل سن

### 🎨 التصميم
- **وضع مظلم** — درجات رمادية وأنسجة سوداء
- **وضع فاتح** — ثيم ذهبي احترافي
- دعم كامل لـ RTL (اتجاه من اليمين لليسار)
- تصميم متجاوب لجميع الشاشات

### 🔔 الإشعارات
- إشعارات فورية للمواعيد والمدفوعات
- تكامل مع n8n للتنبيهات الآلية عبر WhatsApp

---

## 🏗️ هيكل المشروع

```
dental-clinic/
├── prisma/
│   └── schema.prisma           # مخطط قاعدة البيانات (13 نموذج)
├── public/
│   ├── dental-logo.svg          # شعار العيادة
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx           # التخطيط الرئيسي + خط IBM Plex Sans Arabic
│   │   ├── page.tsx             # نقطة الدخول الرئيسية
│   │   ├── globals.css          # الأنماط العامة + ثيم مظلم/فاتح
│   │   └── api/                 # API Routes
│   │       ├── appointments/    # CRUD المواعيد
│   │       ├── patients/        # CRUD المرضى + أسنانهم
│   │       ├── invoices/        # CRUD الفواتير + المدفوعات
│   │       ├── services/        # CRUD الخدمات
│   │       ├── queue/           # قائمة الانتظار
│   │       ├── expenses/        # النفقات
│   │       ├── installments/    # خطط التقسيط
│   │       ├── settings/        # الإعدادات
│   │       ├── notifications/   # الإشعارات
│   │       ├── dashboard/       # لوحة المعلومات
│   │       ├── accounting/      # الإحصائيات المالية
│   │       ├── automation/      # سجلات الأتمتة
│   │       └── webhook/         # Webhooks لـ n8n
│   ├── components/
│   │   ├── LoginScreen.tsx      # شاشة تسجيل الدخول
│   │   ├── DentalChart.tsx      # مخطط الأسنان التفاعلي
│   │   ├── NotificationsPopover.tsx
│   │   ├── modules/
│   │   │   ├── Dashboard.tsx    # لوحة المعلومات
│   │   │   ├── Patients.tsx     # إدارة المرضى
│   │   │   ├── Scheduler.tsx    # جدولة المواعيد (FullCalendar)
│   │   │   ├── Billing.tsx      # الخدمات والأسعار
│   │   │   ├── Accounting.tsx   # الفواتير والمحاسبة
│   │   │   ├── Queue.tsx        # قائمة الانتظار
│   │   │   ├── QuickBooking.tsx # حجز سريع
│   │   │   └── Settings.tsx     # الإعدادات
│   │   └── ui/                  # مكونات shadcn/ui
│   ├── contexts/
│   │   └── AuthContext.tsx       # سياق المصادقة
│   ├── hooks/                   # React Hooks مخصصة
│   └── lib/
│       ├── db.ts                # Prisma Client
│       └── utils.ts             # أدوات مساعدة
├── mini-services/
│   └── dental-server/           # WebSocket service
├── .env.example                 # قالب متغيرات البيئة
├── vercel.json                  # إعدادات Vercel
└── package.json
```

---

## 🗄️ قاعدة البيانات

قاعدة البيانات تعمل على **Supabase PostgreSQL** مع **Prisma ORM**.

### النماذج (13 نموذج):

| النموذج | الوصف |
|---------|-------|
| `Patient` | بيانات المرضى |
| `Appointment` | المواعيد |
| `ToothRecord` | سجلات الأسنان |
| `Service` | الخدمات والأسعار |
| `Invoice` | الفواتير |
| `InvoiceItem` | عناصر الفاتورة |
| `Payment` | المدفوعات |
| `InstallmentPlan` | خطط التقسيط |
| `InstallmentPayment` | أقساط الدفع |
| `Expense` | النفقات |
| `QueueEntry` | قائمة الانتظار |
| `Setting` | الإعدادات |
| `Notification` | الإشعارات |
| `AutomationLog` | سجلات الأتمتة |

---

## 🚀 التشغيل المحلي

### المتطلبات
- [Bun](https://bun.sh/) أو Node.js 18+
- حساب [Supabase](https://supabase.com/) (لقاعدة البيانات)

### الخطوات

```bash
# 1. استنساخ المشروع
git clone https://github.com/a7768972a/dental-clinic.git
cd dental-clinic

# 2. تثبيت الحزم
bun install

# 3. إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env بإعدادات Supabase الخاصة بك

# 4. تطبيق مخطط قاعدة البيانات
bun run db:push

# 5. تشغيل خادم التطوير
bun run dev
```

### متغيرات البيئة المطلوبة

```env
# قاعدة البيانات - Supabase Connection Pooler
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# قاعدة البيانات - اتصال مباشر (للهجرات)
DIRECT_DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

---

## 🔐 بيانات الدخول

| البيئة | كلمة المرور |
|--------|-------------|
| **التطوير** | `1234` |
| **الإنتاج** | كلمة المرور المحددة في الإعدادات |

---

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| **Next.js 16** | إطار العمل الرئيسي (App Router) |
| **React 19** | واجهة المستخدم |
| **TypeScript 5** | لغة البرمجة |
| **Tailwind CSS 4** | التنسيق والتصميم |
| **shadcn/ui** | مكتبة المكونات |
| **Prisma 6** | إدارة قاعدة البيانات |
| **Supabase** | PostgreSQL في السحابة |
| **FullCalendar** | جدولة المواعيد |
| **Framer Motion** | الحركات والانتقالات |
| **Recharts** | الرسوم البيانية |
| **Lucide Icons** | الأيقونات |
| **Sonner** | الإشعارات (Toast) |

---

## 📱 استجابة الشاشات

- 📱 **الهاتف** — تصميم كامل مع قائمة جانبية قابلة للطي
- 📱 **العميل (التلفزيون)** — شاشة عرض كبيرة لقائمة الانتظار
- 💻 **التابلت** — تخطيط متوسط مع كل الوظائف
- 🖥️ **الحاسوب** — عرض كامل مع شريط جانبي ثابت

---

## 🌙 الوضع المظلم

- الوضع المظلم يستخدم **درجات الرمادي والأسود** فقط
- الوضع الفاتح يحتفظ **الثيم الذهبي** الاحترافي
- التبديل يتم من الإعدادات ويُحفظ تلقائياً

---

## 📦 أوامر التشغيل

| الأمر | الوصف |
|-------|-------|
| `bun run dev` | تشغيل خادم التطوير (port 3000) |
| `bun run build` | بناء للإنتاج |
| `bun run start` | تشغيل خادم الإنتاج |
| `bun run lint` | فحص الكود |
| `bun run db:push` | تطبيق مخطط قاعدة البيانات |
| `bun run db:generate` | توليد Prisma Client |
| `bun run db:migrate` | الهجرات |
| `bun run db:reset` | إعادة تعيين قاعدة البيانات |

---

## 🚀 النشر على Vercel

المشروع جاهز للنشر المباشر على **Vercel**:

1. ربط المستودع بـ Vercel
2. إضافة متغيرات البيئة (`DATABASE_URL`, `DIRECT_DATABASE_URL`)
3. النشر التلقائي عند كل push

> انظر `VERCEL_SUPABASE_TROUBLESHOOTING.md` لدليل حل المشاكل

---

## 📄 الرخصة

هذا المشروع خاص بعيادة الدكتور بشار عابدين. جميع الحقوق محفوظة.

---

<div align="center">

**Dental OS** — نظام إدارة عيادة الأسنان المتكامل

صُنع بـ ❤️ باستخدام Next.js + Tailwind CSS + Supabase

</div>
