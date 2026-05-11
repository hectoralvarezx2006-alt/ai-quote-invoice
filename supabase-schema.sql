-- ============================================================
-- AI QUOTE & INVOICE — SUPABASE SQL SCHEMA COMPLETO
-- Copiar y pegar en Supabase SQL Editor
-- ============================================================

-- ── 1. EXTENSIONES ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. TABLA: users (perfil público del usuario) ────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  company_name TEXT,
  nif         TEXT,
  logo_url    TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'España',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, company_name, nif)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'nif'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. TABLA: clients ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  nif         TEXT,
  address     TEXT,
  city        TEXT,
  country     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 4. TABLA: quotes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name  TEXT NOT NULL,
  client_email TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  subtotal     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate     NUMERIC(5, 2)  NOT NULL DEFAULT 21,
  tax_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes        TEXT,
  valid_until  DATE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 5. TABLA: quote_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id    UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ── 6. TABLA: invoices ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id       UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  client_email   TEXT,
  invoice_number TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  subtotal       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate       NUMERIC(5, 2)  NOT NULL DEFAULT 21,
  tax_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 7. TABLA: invoice_items ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ── POLÍTICAS: users ─────────────────────────────────────────
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ── POLÍTICAS: clients ───────────────────────────────────────
CREATE POLICY "clients_all_own" ON public.clients
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── POLÍTICAS: quotes ────────────────────────────────────────
CREATE POLICY "quotes_all_own" ON public.quotes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── POLÍTICAS: quote_items ───────────────────────────────────
CREATE POLICY "quote_items_all_own" ON public.quote_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.quotes WHERE id = quote_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.quotes WHERE id = quote_id)
  );

-- ── POLÍTICAS: invoices ──────────────────────────────────────
CREATE POLICY "invoices_all_own" ON public.invoices
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── POLÍTICAS: invoice_items ─────────────────────────────────
CREATE POLICY "invoice_items_all_own" ON public.invoice_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );

-- ============================================================
-- 9. ÍNDICES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotes_user_id     ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status      ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote  ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv  ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id    ON public.clients(user_id);

-- ============================================================
-- ✅ LISTO — Esquema completo instalado
-- ============================================================
