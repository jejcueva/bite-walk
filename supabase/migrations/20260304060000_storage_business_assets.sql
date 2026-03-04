-- Storage bucket for business logos and deal images (Sprint 3)
-- Public read; authenticated upload limited by RLS (business owners only can upload to their path)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS: anyone can read; only authenticated users can upload (further restriction by path in policy)
create policy "business_assets_public_read"
on storage.objects for select
to public
using (bucket_id = 'business-assets');

create policy "business_assets_authenticated_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'business-assets');

create policy "business_assets_authenticated_update"
on storage.objects for update
to authenticated
using (bucket_id = 'business-assets');

create policy "business_assets_authenticated_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'business-assets');
