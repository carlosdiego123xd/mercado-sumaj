-- =============================================================================
-- PASO 2: convertir en administrador al usuario que creaste en Authentication.
-- 1) Ve a Supabase > Authentication > Users > Add user, y crea tu cuenta con
--    el correo y contraseña que tú quieras.
-- 2) Reemplaza abajo 'tuemail@ejemplo.com' por ese mismo correo (tal cual lo
--    escribiste), y ejecuta este script en el SQL Editor.
-- =============================================================================

update public.profiles
set role = 'admin'
where email = 'tuemail@ejemplo.com';
