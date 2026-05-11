-- Añadir campos nuevos a la tabla users para personalización del PDF
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#3b6ef6',
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Asegurarse de que el bucket de storage existe para logos
-- (esto se hace manualmente en Supabase Dashboard → Storage)
