import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Faltan las variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
    "Revisa tu archivo .env (mira .env.example)."
  );
}

// Cliente principal: mantiene tu sesión iniciada en el navegador.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "sumaj-auth" },
});

// Cliente "de un solo uso" para que un admin pueda crear cuentas nuevas
// (comprador/vendedor/admin) desde dentro de la app SIN que eso cierre o
// reemplace la sesión del admin que está logueado en ese momento.
export const supabaseAction = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: "sumaj-auth-action" },
});
