# AI Quote & Invoice Generator

SaaS para generar presupuestos con IA, convertirlos en facturas, enviarlos al cliente y exportarlos en PDF profesional.

## Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend/Auth/DB**: Supabase (PostgreSQL + RLS)
- **IA**: Google AI Studio (Gemma 3 / Gemini 2.0 Flash) — free tier
- **Email**: Resend (3.000 emails/mes gratis)
- **PDF**: jsPDF (client-side, sin coste de servidor)
- **Deploy**: Vercel

---

## 🚀 Instalación paso a paso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta en orden:
   - `supabase-schema.sql` → crea todas las tablas y políticas RLS
   - `supabase-update-1.sql` → añade campos de personalización (brand_color, iban, website, logo_url)
   - `supabase-update-2.sql` → añade public_token para el portal del cliente
3. Ve a **Settings → API Keys → Legacy anon, service_role API keys** y copia:
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (empieza por `eyJ...`)
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (empieza por `eyJ...`)
4. La URL del proyecto es `https://TU-PROJECT-ID.supabase.co`
5. Ve a **Authentication → URL Configuration** y añade:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

> ⚠️ **Importante**: Usa siempre las claves Legacy (`eyJ...`), no las nuevas `sb_publishable_...`

### 3. Configurar Google AI Studio
1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crea una API key gratuita → `GEMINI_API_KEY`

> Modelo principal: `gemma-3-27b-it` con fallback automático a `gemini-2.0-flash`

### 4. Configurar Resend (emails)
1. Crea cuenta en [resend.com](https://resend.com)
2. Ve a **API Keys → Create API key** → copia la key → `RESEND_API_KEY`
3. En plan gratuito solo puedes enviar a tu propio email hasta verificar un dominio

### 5. Crear `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Arrancar
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto

```
ai-quote-invoice/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard con stats
│   │   ├── quotes/
│   │   │   ├── page.tsx              # Lista presupuestos
│   │   │   ├── new/page.tsx          # Generador IA + editor
│   │   │   └── [id]/page.tsx         # Detalle + enviar + portal
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clients/page.tsx
│   │   └── settings/page.tsx         # Logo + color + IBAN + datos
│   ├── p/
│   │   └── [token]/page.tsx          # Portal público del cliente
│   ├── api/
│   │   ├── generate-quote/route.ts   # IA (server-side)
│   │   ├── send-quote/route.ts       # Envío email al cliente
│   │   ├── quote-respond/route.ts    # Aceptar/rechazar desde portal
│   │   └── public-quote/route.ts     # Cargar presupuesto por token
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── layout/
│       ├── Sidebar.tsx
│       └── TopBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── services/
│   ├── ai.ts                         # generateQuote() con Gemma/Gemini
│   ├── quotes.ts                     # CRUD presupuestos
│   ├── invoices.ts                   # CRUD facturas + convertir
│   ├── email.ts                      # Envío emails con Resend
│   └── pdf.ts                        # PDF con jsPDF (color + logo)
├── types/
│   └── index.ts
├── middleware.ts                     # Protección rutas (excluye /p/)
├── supabase-schema.sql               # Schema base
├── supabase-update-1.sql             # Campos personalización PDF
└── supabase-update-2.sql             # public_token portal cliente
```

---

## ✨ Funcionalidades completas

| Feature | Estado |
|---|---|
| Login / Registro | ✅ |
| Generación con IA (Gemma 3 / Gemini) | ✅ |
| Editor de presupuesto | ✅ |
| Gestión de items (añadir/editar/eliminar) | ✅ |
| IVA configurable (0/4/10/21%) | ✅ |
| Cambio de estado (borrador/enviado/aceptado/rechazado) | ✅ |
| Convertir presupuesto a factura | ✅ |
| Numeración automática de facturas (FAC-2026-0001) | ✅ |
| Exportar PDF profesional | ✅ |
| PDF con color de marca personalizable | ✅ |
| PDF con logo de empresa | ✅ |
| IBAN en pie de facturas PDF | ✅ |
| Dashboard con stats e ingresos | ✅ |
| Gestión de clientes | ✅ |
| Configuración de empresa | ✅ |
| Envío de presupuesto por email al cliente | ✅ |
| Portal público del cliente (sin login) | ✅ |
| Cliente puede aceptar/rechazar desde el portal | ✅ |
| Email de notificación al aceptar/rechazar | ✅ |
| Row Level Security (Supabase) | ✅ |
| Rutas protegidas (middleware) | ✅ |

---

## 🔄 Flujo completo de uso

```
1. Crear presupuesto con IA
        ↓
2. Editar items y precios
        ↓
3. Guardar (estado: Borrador)
        ↓
4. Enviar al cliente por email (estado: Enviado)
        ↓
5. Cliente abre el portal → Acepta o Rechaza
        ↓
6. Tú recibes email de notificación (estado: Aceptado)
        ↓
7. Convertir a Factura
        ↓
8. Exportar PDF y cobrar
```

---

## 🎨 Personalización del PDF

Ve a **Configuración** en el dashboard:
- **Logo**: sube tu logo (PNG/JPG, máx 2MB) — requiere bucket `logos` en Supabase Storage
- **Color de marca**: elige entre paleta predefinida o color personalizado con vista previa en tiempo real
- **IBAN**: aparece al pie de todas las facturas PDF

---

## 🚢 Deploy en Vercel

```bash
npm i -g vercel
vercel --prod
```

Variables de entorno a añadir en Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL  ← URL de Vercel (ej: https://mi-app.vercel.app)
```

En Supabase → **Authentication → URL Configuration** añade la URL de Vercel a Redirect URLs.
En Resend → verifica tu dominio para poder enviar emails a cualquier destinatario.

---

## 🔐 Seguridad

- Las API keys nunca se exponen al cliente
- Gemini y Resend se usan solo en API Routes (server-side)
- Supabase RLS garantiza aislamiento total entre usuarios
- El portal público usa tokens UUID aleatorios (no predecibles)
- Middleware de Next.js protege todas las rutas del dashboard

---

## 💡 Personalización rápida

| Qué cambiar | Dónde |
|---|---|
| IVA por defecto | `app/dashboard/quotes/new/page.tsx` → `useState(21)` |
| Modelo de IA | `services/ai.ts` → constante `MODEL` |
| Días de vencimiento facturas | `services/invoices.ts` → `addDays(new Date(), 30)` |
| Colores de la UI | `tailwind.config.js` → `colors.brand` |
| Email remitente | `services/email.ts` → `FROM_EMAIL` |
| Dominio emails Resend | [resend.com/domains](https://resend.com/domains) |

---

## 🐛 Solución de problemas comunes

**Error 403 al guardar** → Usar claves Legacy (`eyJ...`) en vez de `sb_publishable_...`

**Error al guardar (user_id null)** → El cliente Supabase no detecta la sesión; asegúrate de que `services/quotes.ts` llama a `supabase.auth.getUser()` antes de insertar

**Portal del cliente 404** → Verificar que `middleware.ts` excluye `/p/` del matcher

**Email solo llega a tu propio correo** → Verificar dominio en [resend.com/domains](https://resend.com/domains)

**Error `.next` al reiniciar (Windows)** → Ejecutar `Remove-Item -Recurse -Force .next` antes de `npm run dev`

**public_token null en presupuestos antiguos** → Ejecutar en Supabase SQL:
```sql
UPDATE public.quotes
SET public_token = gen_random_uuid()::text
WHERE public_token IS NULL;
```

**Invalid API key en portal** → Verificar que `SUPABASE_SERVICE_ROLE_KEY` no tiene caracteres extra al final
