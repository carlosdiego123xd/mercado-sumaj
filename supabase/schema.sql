-- =============================================================================
-- MERCADO SUMAJ — SCRIPT ÚNICO DE BASE DE DATOS
-- Copia y pega TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Se puede ejecutar una sola vez. Crea las tablas, las reglas de seguridad
-- y las carpetas de almacenamiento (buckets) para imágenes y comprobantes.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- TABLAS
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'comprador' check (role in ('comprador','vendedor','admin')),
  seller_id uuid,
  identity_status text not null default 'not_submitted' check (identity_status in ('not_submitted','pending','verified','rejected')),
  blocked boolean not null default false,
  blocked_reason text,
  blocked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sellers (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  rating numeric default 0,
  since text default to_char(now(), 'YYYY'),
  verified boolean default true,
  blocked boolean default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_seller_fk,
  add constraint profiles_seller_fk foreign key (seller_id) references public.sellers(id) on delete set null;

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  name text not null,
  description text default '',
  category text default 'Otros',
  price numeric not null,
  previous_price numeric,
  stock integer not null default 0,
  image_path text,
  rating numeric default 0,
  reviews_count integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  batch_id text,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  total numeric not null,
  payment_method text,
  proof_path text,
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','rejected')),
  rejection_reason text,
  order_status text not null default 'pendiente de verificación',
  delivery_method text,
  delivery_address text,
  delivery_cost numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty integer not null,
  price numeric not null
);

create table if not exists public.verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text,
  birth_date date,
  id_front_path text,
  id_back_path text,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  photo_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id),
  text text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- CREAR AUTOMÁTICAMENTE UN PERFIL CUANDO ALGUIEN SE REGISTRA
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'comprador')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- FUNCIÓN PARA SABER SI QUIEN HACE LA CONSULTA ES ADMINISTRADOR
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

-- -----------------------------------------------------------------------------
-- EVITA QUE UN USUARIO SE ASIGNE A SÍ MISMO EL ROL DE ADMIN/VENDEDOR O SE
-- DESBLOQUEE, AUNQUE MODIFIQUE SU PROPIA FILA DE PERFIL DESDE LA APP.
-- -----------------------------------------------------------------------------

create or replace function public.protect_profile_privileges()
returns trigger as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.blocked := old.blocked;
    new.blocked_reason := old.blocked_reason;
    new.blocked_at := old.blocked_at;
    new.seller_id := old.seller_id;
    new.identity_status := old.identity_status;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileges();

-- -----------------------------------------------------------------------------
-- SEGURIDAD POR FILA (RLS): cada quien ve y edita solo lo que le corresponde
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.verifications enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_log enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "sellers_select" on public.sellers;
create policy "sellers_select" on public.sellers for select using (true);
drop policy if exists "sellers_insert" on public.sellers;
create policy "sellers_insert" on public.sellers for insert with check (public.is_admin());
drop policy if exists "sellers_update" on public.sellers;
create policy "sellers_update" on public.sellers for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products for select using (true);
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert with check (
  public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
);
drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products for update using (
  public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
);
drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products for delete using (
  public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
);

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select using (
  buyer_id = auth.uid() or public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
);
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert with check (buyer_id = auth.uid());
drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update using (
  public.is_admin() or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
);

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items for select using (
  exists (
    select 1 from public.orders o where o.id = order_id
    and (o.buyer_id = auth.uid() or public.is_admin() or exists (select 1 from public.sellers s where s.id = o.seller_id and s.owner_id = auth.uid()))
  )
);
drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);

drop policy if exists "verifications_select" on public.verifications;
create policy "verifications_select" on public.verifications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "verifications_insert" on public.verifications;
create policy "verifications_insert" on public.verifications for insert with check (user_id = auth.uid());
drop policy if exists "verifications_update" on public.verifications;
create policy "verifications_update" on public.verifications for update using (public.is_admin());

drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select using (true);
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert with check (buyer_id = auth.uid());

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update using (user_id = auth.uid());
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert with check (auth.uid() is not null);

drop policy if exists "admin_log_select" on public.admin_log;
create policy "admin_log_select" on public.admin_log for select using (public.is_admin());
drop policy if exists "admin_log_insert" on public.admin_log;
create policy "admin_log_insert" on public.admin_log for insert with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- ALMACENAMIENTO: crea las 3 carpetas (buckets) que usa la app.
-- No necesitas crearlas a mano en el panel, este script ya lo hace.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', false),
  ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product_images_write" on storage.objects;
create policy "product_images_write" on storage.objects for insert with check (bucket_id = 'product-images' and auth.uid() is not null);
drop policy if exists "product_images_update" on storage.objects;
create policy "product_images_update" on storage.objects for update using (bucket_id = 'product-images' and owner = auth.uid());
drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete" on storage.objects for delete using (bucket_id = 'product-images' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "payment_proofs_read" on storage.objects;
create policy "payment_proofs_read" on storage.objects for select using (bucket_id = 'payment-proofs' and (owner = auth.uid() or public.is_admin()));
drop policy if exists "payment_proofs_write" on storage.objects;
create policy "payment_proofs_write" on storage.objects for insert with check (bucket_id = 'payment-proofs' and auth.uid() is not null);
drop policy if exists "payment_proofs_delete" on storage.objects;
create policy "payment_proofs_delete" on storage.objects for delete using (bucket_id = 'payment-proofs' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "verification_docs_read" on storage.objects;
create policy "verification_docs_read" on storage.objects for select using (bucket_id = 'verification-docs' and (owner = auth.uid() or public.is_admin()));
drop policy if exists "verification_docs_write" on storage.objects;
create policy "verification_docs_write" on storage.objects for insert with check (bucket_id = 'verification-docs' and auth.uid() is not null);
drop policy if exists "verification_docs_delete" on storage.objects;
create policy "verification_docs_delete" on storage.objects for delete using (bucket_id = 'verification-docs' and (owner = auth.uid() or public.is_admin()));

-- =============================================================================
-- LISTO. Ya tienes toda la base de datos, la seguridad y el almacenamiento.
-- Siguiente paso: crea tu usuario administrador en Authentication > Users,
-- y luego ejecuta el archivo "promote_admin.sql" cambiando el correo.
-- =============================================================================
