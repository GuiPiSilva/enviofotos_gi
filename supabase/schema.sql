-- Execute no SQL Editor do Supabase. Convide admins pelo Auth antes de cadastrá-los.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.galleries (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 client_name text not null default '',
 description text not null default '',
 event_date date,
 status text not null default 'draft' check(status in ('draft','published')),
 share_token text unique not null check (share_token ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.photos (
 id uuid primary key default gen_random_uuid(),
 gallery_id uuid not null references public.galleries(id) on delete cascade,
 file_name text not null,
 storage_path text not null unique,
 created_at timestamptz not null default now()
);
create index if not exists photos_gallery_idx on public.photos(gallery_id);
create index if not exists galleries_status_idx on public.galleries(status);
alter table public.admin_users enable row level security;
alter table public.galleries enable row level security;
alter table public.photos enable row level security;
revoke all on public.admin_users,public.galleries,public.photos from anon;
grant select on public.admin_users to authenticated;
grant select,insert,update,delete on public.galleries,public.photos to authenticated;
create policy "Admins consultam sua permissão" on public.admin_users for select to authenticated using (user_id=(select auth.uid()));
create policy "Admins leem galerias" on public.galleries for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins criam galerias" on public.galleries for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins editam galerias" on public.galleries for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins excluem galerias" on public.galleries for delete to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins leem fotos" on public.photos for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins criam fotos" on public.photos for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
create policy "Admins excluem fotos" on public.photos for delete to authenticated using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('gi-fotos','gi-fotos',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false;
create policy "Admins fazem upload" on storage.objects for insert to authenticated with check (
 bucket_id='gi-fotos' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
create policy "Admins acessam imagens" on storage.objects for select to authenticated using (
 bucket_id='gi-fotos' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
create policy "Admins apagam imagens" on storage.objects for delete to authenticated using (
 bucket_id='gi-fotos' and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
-- Depois de criar seu usuário em Authentication > Users, autorize seu UUID:
-- insert into public.admin_users(user_id) values ('COLE-O-UUID-DO-USUARIO');
