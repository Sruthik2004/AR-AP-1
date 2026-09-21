-- Core AR/AP multi-tenant schema with org-scoped RLS
-- Depends on Supabase Auth (auth.users)

create extension if not exists "pgcrypto";

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'admin',
  'manager',
  'accountant',
  'auditor'
);

create type public.contact_type as enum (
  'customer',
  'vendor'
);

create type public.invoice_status as enum (
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue'
);

create type public.bill_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'partially_paid',
  'paid',
  'rejected'
);

create type public.payment_entity_type as enum (
  'invoice',
  'bill'
);

create type public.approval_status as enum (
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_base_currency_check
    check (base_currency ~ '^[A-Z]{3}$')
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'accountant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_check check (position('@' in email) > 1)
);

create unique index users_org_email_uidx on public.users (org_id, lower(email));
create index users_org_id_idx on public.users (org_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  type public.contact_type not null,
  name text not null,
  email text,
  phone text,
  tax_id text,
  currency char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_currency_check check (currency ~ '^[A-Z]{3}$')
);

create index contacts_org_id_idx on public.contacts (org_id);
create index contacts_org_type_idx on public.contacts (org_id, type);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.contacts (id) on delete restrict,
  invoice_number text not null,
  total_amount numeric(18, 2) not null default 0 check (total_amount >= 0),
  balance_due numeric(18, 2) not null default 0 check (balance_due >= 0),
  status public.invoice_status not null default 'draft',
  due_date date not null,
  issue_date date not null default (current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_balance_lte_total check (balance_due <= total_amount),
  constraint invoices_unique_number_per_org unique (org_id, invoice_number)
);

create index invoices_org_id_idx on public.invoices (org_id);
create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoices_status_idx on public.invoices (org_id, status);
create index invoices_due_date_idx on public.invoices (org_id, due_date);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(18, 4) not null default 1 check (quantity > 0),
  unit_price numeric(18, 2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  line_total numeric(18, 2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.contacts (id) on delete restrict,
  bill_number text not null,
  total_amount numeric(18, 2) not null default 0 check (total_amount >= 0),
  balance_due numeric(18, 2) not null default 0 check (balance_due >= 0),
  status public.bill_status not null default 'draft',
  due_date date not null,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bills_balance_lte_total check (balance_due <= total_amount),
  constraint bills_unique_number_per_org unique (org_id, bill_number)
);

create index bills_org_id_idx on public.bills (org_id);
create index bills_vendor_id_idx on public.bills (vendor_id);
create index bills_status_idx on public.bills (org_id, status);
create index bills_due_date_idx on public.bills (org_id, due_date);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  description text not null,
  quantity numeric(18, 4) not null default 1 check (quantity > 0),
  unit_price numeric(18, 2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  line_total numeric(18, 2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bill_items_bill_id_idx on public.bill_items (bill_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  entity_type public.payment_entity_type not null,
  entity_id uuid not null,
  amount numeric(18, 2) not null check (amount > 0),
  payment_method text not null,
  reference_code text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_org_id_idx on public.payments (org_id);
create index payments_entity_idx on public.payments (entity_type, entity_id);
create index payments_paid_at_idx on public.payments (org_id, paid_at desc);

create table public.approval_logs (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  approved_by_user_id uuid not null references public.users (id) on delete restrict,
  status public.approval_status not null,
  comments text,
  "timestamp" timestamptz not null default now()
);

create index approval_logs_bill_id_idx on public.approval_logs (bill_id);
create index approval_logs_approver_idx on public.approval_logs (approved_by_user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  changes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_id_idx on public.audit_logs (org_id);
create index audit_logs_created_at_idx on public.audit_logs (org_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (org_id, entity, entity_id);

-- ---------------------------------------------------------------------------
-- Helper: current user's organization (SECURITY DEFINER, private schema)
-- ---------------------------------------------------------------------------

create or replace function private.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.org_id
  from public.users u
  where u.id = auth.uid();
$$;

revoke all on function private.user_org_id() from public;
grant execute on function private.user_org_id() to authenticated, service_role;

create or replace function private.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.org_id = target_org_id
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Integrity helpers for polymorphic payments + contact types
-- ---------------------------------------------------------------------------

create or replace function public.validate_payment_entity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.entity_type = 'invoice' then
    if not exists (
      select 1
      from public.invoices i
      where i.id = new.entity_id
        and i.org_id = new.org_id
    ) then
      raise exception 'payment entity_id must reference an invoice in the same organization';
    end if;
  elsif new.entity_type = 'bill' then
    if not exists (
      select 1
      from public.bills b
      where b.id = new.entity_id
        and b.org_id = new.org_id
    ) then
      raise exception 'payment entity_id must reference a bill in the same organization';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_validate_entity
before insert or update on public.payments
for each row
execute function public.validate_payment_entity();

create or replace function public.validate_invoice_customer()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.contacts c
    where c.id = new.customer_id
      and c.org_id = new.org_id
      and c.type = 'customer'
  ) then
    raise exception 'invoice customer_id must reference a customer contact in the same organization';
  end if;

  return new;
end;
$$;

create trigger invoices_validate_customer
before insert or update on public.invoices
for each row
execute function public.validate_invoice_customer();

create or replace function public.validate_bill_vendor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.contacts c
    where c.id = new.vendor_id
      and c.org_id = new.org_id
      and c.type = 'vendor'
  ) then
    raise exception 'bill vendor_id must reference a vendor contact in the same organization';
  end if;

  return new;
end;
$$;

create trigger bills_validate_vendor
before insert or update on public.bills
for each row
execute function public.validate_bill_vendor();

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger invoice_items_set_updated_at
before update on public.invoice_items
for each row execute function public.set_updated_at();

create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

create trigger bill_items_set_updated_at
before update on public.bill_items
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.payments enable row level security;
alter table public.approval_logs enable row level security;
alter table public.audit_logs enable row level security;

-- organizations
create policy "organizations_select_own"
  on public.organizations
  for select
  to authenticated
  using (id = private.user_org_id());

create policy "organizations_insert_authenticated"
  on public.organizations
  for insert
  to authenticated
  with check (true);

create policy "organizations_update_own"
  on public.organizations
  for update
  to authenticated
  using (id = private.user_org_id())
  with check (id = private.user_org_id());

create policy "organizations_delete_own"
  on public.organizations
  for delete
  to authenticated
  using (id = private.user_org_id());

-- users
create policy "users_select_same_org"
  on public.users
  for select
  to authenticated
  using (org_id = private.user_org_id());

create policy "users_insert_same_org_or_self"
  on public.users
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and (
      org_id = private.user_org_id()
      -- Bootstrap: first profile after creating/joining an organization
      or private.user_org_id() is null
    )
  );

create policy "users_update_same_org"
  on public.users
  for update
  to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "users_delete_same_org"
  on public.users
  for delete
  to authenticated
  using (org_id = private.user_org_id());

-- contacts
create policy "contacts_select_same_org"
  on public.contacts for select to authenticated
  using (org_id = private.user_org_id());

create policy "contacts_insert_same_org"
  on public.contacts for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "contacts_update_same_org"
  on public.contacts for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "contacts_delete_same_org"
  on public.contacts for delete to authenticated
  using (org_id = private.user_org_id());

-- invoices
create policy "invoices_select_same_org"
  on public.invoices for select to authenticated
  using (org_id = private.user_org_id());

create policy "invoices_insert_same_org"
  on public.invoices for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "invoices_update_same_org"
  on public.invoices for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "invoices_delete_same_org"
  on public.invoices for delete to authenticated
  using (org_id = private.user_org_id());

-- invoice_items (via parent invoice org)
create policy "invoice_items_select_same_org"
  on public.invoice_items for select to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.org_id = private.user_org_id()
    )
  );

create policy "invoice_items_insert_same_org"
  on public.invoice_items for insert to authenticated
  with check (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.org_id = private.user_org_id()
    )
  );

create policy "invoice_items_update_same_org"
  on public.invoice_items for update to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.org_id = private.user_org_id()
    )
  )
  with check (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.org_id = private.user_org_id()
    )
  );

create policy "invoice_items_delete_same_org"
  on public.invoice_items for delete to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.org_id = private.user_org_id()
    )
  );

-- bills
create policy "bills_select_same_org"
  on public.bills for select to authenticated
  using (org_id = private.user_org_id());

create policy "bills_insert_same_org"
  on public.bills for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "bills_update_same_org"
  on public.bills for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "bills_delete_same_org"
  on public.bills for delete to authenticated
  using (org_id = private.user_org_id());

-- bill_items (via parent bill org)
create policy "bill_items_select_same_org"
  on public.bill_items for select to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "bill_items_insert_same_org"
  on public.bill_items for insert to authenticated
  with check (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "bill_items_update_same_org"
  on public.bill_items for update to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  )
  with check (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "bill_items_delete_same_org"
  on public.bill_items for delete to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

-- payments
create policy "payments_select_same_org"
  on public.payments for select to authenticated
  using (org_id = private.user_org_id());

create policy "payments_insert_same_org"
  on public.payments for insert to authenticated
  with check (
    org_id = private.user_org_id()
    and (
      (
        entity_type = 'invoice'
        and exists (
          select 1
          from public.invoices i
          where i.id = entity_id
            and i.org_id = private.user_org_id()
        )
      )
      or (
        entity_type = 'bill'
        and exists (
          select 1
          from public.bills b
          where b.id = entity_id
            and b.org_id = private.user_org_id()
        )
      )
    )
  );

create policy "payments_update_same_org"
  on public.payments for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "payments_delete_same_org"
  on public.payments for delete to authenticated
  using (org_id = private.user_org_id());

-- approval_logs (via parent bill org)
create policy "approval_logs_select_same_org"
  on public.approval_logs for select to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "approval_logs_insert_same_org"
  on public.approval_logs for insert to authenticated
  with check (
    approved_by_user_id = auth.uid()
    and exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "approval_logs_update_same_org"
  on public.approval_logs for update to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  )
  with check (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

create policy "approval_logs_delete_same_org"
  on public.approval_logs for delete to authenticated
  using (
    exists (
      select 1
      from public.bills b
      where b.id = bill_id
        and b.org_id = private.user_org_id()
    )
  );

-- audit_logs (append-friendly: select + insert only)
create policy "audit_logs_select_same_org"
  on public.audit_logs for select to authenticated
  using (org_id = private.user_org_id());

create policy "audit_logs_insert_same_org"
  on public.audit_logs for insert to authenticated
  with check (
    org_id = private.user_org_id()
    and (user_id is null or user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.validate_payment_entity() to authenticated;
grant execute on function public.validate_invoice_customer() to authenticated;
grant execute on function public.validate_bill_vendor() to authenticated;
grant execute on function public.set_updated_at() to authenticated;
