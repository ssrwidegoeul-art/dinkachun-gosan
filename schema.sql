-- Supabase SQL Editor 에서 실행하세요

-- 1) 데이터 저장 테이블
create table if not exists kv (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
alter table kv enable row level security;
drop policy if exists "kv anon all" on kv;
create policy "kv anon all" on kv for all using (true) with check (true);

-- 2) 사진 저장 버킷 (public)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos read" on storage.objects;
drop policy if exists "photos insert" on storage.objects;
drop policy if exists "photos delete" on storage.objects;
create policy "photos read"   on storage.objects for select using (bucket_id = 'photos');
create policy "photos insert" on storage.objects for insert with check (bucket_id = 'photos');
create policy "photos delete" on storage.objects for delete using (bucket_id = 'photos');
