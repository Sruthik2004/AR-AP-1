-- Bill attachments + per-line tax for AP

alter table public.bills
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

alter table public.bill_items
  add column if not exists tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100);

comment on column public.bills.attachment_path is
  'Storage object path in vendor-invoices bucket';
comment on column public.bill_items.tax_rate is
  'GST/tax percent applied to quantity × unit_price before computing line_total';

-- Storage bucket for vendor invoice uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-invoices',
  'vendor-invoices',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Paths are stored as: {org_id}/{filename}
drop policy if exists "vendor_invoices_select_own_org" on storage.objects;
drop policy if exists "vendor_invoices_insert_own_org" on storage.objects;
drop policy if exists "vendor_invoices_update_own_org" on storage.objects;
drop policy if exists "vendor_invoices_delete_own_org" on storage.objects;

create policy "vendor_invoices_select_own_org"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vendor-invoices'
    and (storage.foldername(name))[1] = private.user_org_id()::text
  );

create policy "vendor_invoices_insert_own_org"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vendor-invoices'
    and (storage.foldername(name))[1] = private.user_org_id()::text
  );

create policy "vendor_invoices_update_own_org"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vendor-invoices'
    and (storage.foldername(name))[1] = private.user_org_id()::text
  )
  with check (
    bucket_id = 'vendor-invoices'
    and (storage.foldername(name))[1] = private.user_org_id()::text
  );

create policy "vendor_invoices_delete_own_org"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vendor-invoices'
    and (storage.foldername(name))[1] = private.user_org_id()::text
  );
