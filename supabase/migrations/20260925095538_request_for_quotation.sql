-- Request for quotation: compare vendor quotes before a bill is created.

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  status text not null default 'open' check (status in ('open', 'evaluated')),
  selected_quote_id uuid,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rfq_quotes (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  vendor_id uuid not null references public.contacts (id) on delete restrict,
  amount numeric(18, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

alter table public.rfqs
  add constraint rfqs_selected_quote_fkey
  foreign key (selected_quote_id) references public.rfq_quotes (id) on delete set null;

create index rfqs_org_id_idx on public.rfqs (org_id, created_at desc);
create index rfq_quotes_rfq_id_idx on public.rfq_quotes (rfq_id);

create trigger rfqs_set_updated_at
before update on public.rfqs
for each row execute function public.set_updated_at();

alter table public.rfqs enable row level security;
alter table public.rfq_quotes enable row level security;

create policy "rfqs_select_same_org"
  on public.rfqs for select to authenticated
  using (org_id = private.user_org_id());

create policy "rfqs_insert_same_org"
  on public.rfqs for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "rfqs_update_same_org"
  on public.rfqs for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "rfqs_delete_same_org"
  on public.rfqs for delete to authenticated
  using (org_id = private.user_org_id());

create policy "rfq_quotes_select_same_org"
  on public.rfq_quotes for select to authenticated
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_id
        and r.org_id = private.user_org_id()
    )
  );

create policy "rfq_quotes_insert_same_org"
  on public.rfq_quotes for insert to authenticated
  with check (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_id
        and r.org_id = private.user_org_id()
    )
    and exists (
      select 1
      from public.contacts c
      where c.id = vendor_id
        and c.org_id = private.user_org_id()
        and c.type = 'vendor'
    )
  );

create policy "rfq_quotes_delete_same_org"
  on public.rfq_quotes for delete to authenticated
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = rfq_id
        and r.org_id = private.user_org_id()
    )
  );

grant select, insert, update, delete on public.rfqs to authenticated;
grant select, insert, delete on public.rfq_quotes to authenticated;
