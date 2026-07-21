-- Force PostgREST schema cache reload by touching the table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS _schema_refresh_trigger int4;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS _schema_refresh_trigger;

SELECT pg_notify('pgrst', 'reload schema');
