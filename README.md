# Mercado Sumaj

App de marketplace con React + Vite, conectada a una base de datos real en
Supabase. Compradores, vendedores y un panel de administración, lista para
publicar en Netlify.

## Qué SÍ funciona de verdad en esta versión

- Registro, inicio de sesión y recuperación de contraseña reales (Supabase Auth).
- Roles reales (comprador / vendedor / admin) guardados en la base de datos;
  nadie puede cambiarse el rol a sí mismo.
- Publicar productos con foto, buscar y filtrar por nombre/categoría/precio.
- Carrito que se divide automáticamente en un pedido por cada vendedor.
- Subida real del comprobante de pago; el administrador lo revisa y
  aprueba/rechaza con motivo.
- Verificación de identidad (3 fotos + datos) revisada por el administrador;
  al aprobarla, la cuenta se convierte en vendedor automáticamente.
- Reseñas, notificaciones, bloqueo de cuentas con motivo y fecha, registro de
  acciones del administrador, y una pantalla para crear nuevos usuarios
  (comprador/vendedor/admin) sin volver a Supabase.
- Diseño adaptado: barra lateral en computadora, barra inferior en celular.

## Qué queda pendiente para una siguiente etapa

Variantes de producto (talla/color), seguimiento de envío más detallado,
sistema de disputas, y notificaciones en tiempo real (hoy se actualizan al
recargar la pantalla). Ninguna de estas afecta lo esencial: registrarse,
comprar, vender, pagar, verificar identidad y administrar.

---

## PASO A PASO (sin conocimientos técnicos)

### Parte 1 — Crear tu base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com), crea una cuenta gratis y
   crea un **proyecto nuevo** (elige cualquier nombre y contraseña de base
   de datos, no las necesitarás después).
2. Cuando el proyecto esté listo, ve al menú **SQL Editor** (ícono de
   ventana con `>_`) y haz clic en **New query**.
3. Abre el archivo `supabase/schema.sql` de esta carpeta, copia **todo** su
   contenido, pégalo en el editor y presiona **Run**.
   - Esto crea todas las tablas, las reglas de seguridad, y también las 3
     carpetas de almacenamiento que la app necesita (`product-images`,
     `payment-proofs`, `verification-docs`). **No necesitas crear ningún
     bucket a mano**, el script ya lo hizo.
4. Ve al menú **Authentication > Users** y haz clic en **Add user**. Escribe
   el correo y la contraseña con la que TÚ vas a entrar como administrador.
   Marca la opción de "Auto Confirm User" si aparece, para no tener que
   confirmar el correo.
5. Abre el archivo `supabase/promote_admin.sql`, cambia
   `tuemail@ejemplo.com` por el correo que usaste en el paso 4, copia todo
   el contenido, pégalo en una **New query** del SQL Editor, y presiona
   **Run**. Con esto, esa cuenta queda como Administrador.

Con esto tu base de datos ya está lista. Para crear más usuarios en el
futuro (empleados, vendedores, etc.) **no vuelvas a Supabase**: entra a la
app con tu cuenta de administrador y usa la pantalla "Crear usuario".

### Parte 2 — Conectar la app con tu proyecto de Supabase

1. En Supabase, ve a **Settings** (ícono de engranaje) **> API**.
2. Copia el valor de **Project URL**.
3. Copia el valor de **Project API keys > anon / public**.
4. En esta carpeta del proyecto, crea una copia del archivo `.env.example`
   y renómbrala a `.env`.
5. Abre `.env` y pega tus dos valores, quedando algo así:
   ```
   VITE_SUPABASE_URL=https://abcxyz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
6. Guarda el archivo.

### Parte 3 — Publicar en Netlify

1. Sube esta carpeta a un repositorio de GitHub (o usa la opción de Netlify
   para arrastrar y soltar una carpeta, si prefieres no usar GitHub).
2. Entra a [netlify.com](https://netlify.com), inicia sesión y elige
   **Add new site > Import an existing project** (o "Deploy manually" si
   vas a arrastrar la carpeta).
3. Si conectaste GitHub: Netlify detectará automáticamente que es un
   proyecto Vite (usa el archivo `netlify.toml` incluido). Antes de darle a
   "Deploy", ve a **Site settings > Environment variables** y agrega ahí
   las mismas dos variables de tu archivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Presiona **Deploy site**. En un par de minutos tu marketplace estará en
   línea con una dirección tipo `tu-app.netlify.app`.

Si en algún momento cambias de proyecto de Supabase, solo necesitas
actualizar esas dos variables (en tu `.env` local y en Netlify) — nada más
del código cambia.

---

## RESUMEN RÁPIDO

**En Supabase:**
1. Crea el proyecto.
2. Pega y ejecuta `supabase/schema.sql` en el SQL Editor.
3. Crea tu usuario en Authentication > Users (con tu correo y contraseña).
4. Pega y ejecuta `supabase/promote_admin.sql` (con tu correo) para hacerte administrador.
5. Copia tu **Project URL** y tu **anon key** desde Settings > API.

**En tu computadora / Netlify:**
6. Pega esos dos valores en el archivo `.env` (para probar localmente) y en
   las variables de entorno de Netlify (para publicar).
7. Sube el proyecto a Netlify y presiona Deploy.
8. Entra a tu app con tu correo de administrador — desde ahí puedes crear
   todos los demás usuarios que necesites.
