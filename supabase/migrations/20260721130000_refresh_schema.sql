-- Force PostgREST schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');
