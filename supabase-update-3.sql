-- ============================================================
-- UPDATE 3: Tabla de gastos deducibles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'otros',
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate    NUMERIC(5, 2)  NOT NULL DEFAULT 21,
  tax_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  provider    TEXT,
  invoice_ref TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_all_own" ON public.expenses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON public.expenses(date);
