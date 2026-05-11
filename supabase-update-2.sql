-- Añadir token público a quotes para el portal del cliente
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON public.quotes(public_token);

-- Política RLS: cualquiera puede leer un presupuesto por su token público
CREATE POLICY "quotes_public_by_token" ON public.quotes
  FOR SELECT USING (public_token IS NOT NULL);

-- Política RLS: cualquiera puede actualizar el estado via token (accept/reject)
-- Lo controlamos desde la API Route con service role, no hace falta política extra
