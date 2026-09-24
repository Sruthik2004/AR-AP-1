-- Accounting foundation: chart of accounts, tax, bank, journals, ledger posting.
-- Reports read posted journal lines. They do not sum bills or invoices directly.

create type public.account_type as enum (
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense'
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  account_type public.account_type not null,
  is_group boolean not null default false,
  parent_id uuid references public.accounts (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_code_check check (code ~ '^[0-9]{6}$'),
  constraint accounts_org_code_uidx unique (org_id, code)
);

create index accounts_org_id_idx on public.accounts (org_id);
create index accounts_parent_id_idx on public.accounts (parent_id);

create table public.tax_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  rate numeric(5, 2) not null check (rate >= 0 and rate <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_codes_org_name_uidx unique (org_id, name)
);

create index tax_codes_org_id_idx on public.tax_codes (org_id);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  bank_name text,
  account_number text,
  ifsc text,
  currency char(3) not null default 'INR',
  gl_account_id uuid not null references public.accounts (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_currency_check check (currency ~ '^[A-Z]{3}$')
);

create index bank_accounts_org_id_idx on public.bank_accounts (org_id);
create index bank_accounts_gl_account_id_idx on public.bank_accounts (gl_account_id);

create table public.journals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  journal_number text not null,
  posting_date date not null,
  description text not null,
  source text not null,
  source_id uuid,
  status text not null default 'draft',
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journals_org_number_uidx unique (org_id, journal_number),
  constraint journals_source_check check (
    source in ('manual', 'ap_bill', 'ar_invoice', 'ar_payment')
  ),
  constraint journals_status_check check (status in ('draft', 'posted')),
  constraint journals_description_check check (char_length(description) between 3 and 200)
);

create unique index journals_source_document_uidx
  on public.journals (org_id, source, source_id)
  where source_id is not null;

create index journals_org_date_idx on public.journals (org_id, posting_date desc);
create index journals_org_status_idx on public.journals (org_id, status);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  description text not null,
  debit numeric(18, 2) not null default 0,
  credit numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint journal_lines_debit_nonnegative check (debit >= 0),
  constraint journal_lines_credit_nonnegative check (credit >= 0),
  constraint journal_lines_one_side check (not (debit > 0 and credit > 0)),
  constraint journal_lines_nonzero check (debit > 0 or credit > 0)
);

create index journal_lines_journal_id_idx on public.journal_lines (journal_id);
create index journal_lines_account_id_idx on public.journal_lines (account_id);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger tax_codes_set_updated_at
before update on public.tax_codes
for each row execute function public.set_updated_at();

create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();

create trigger journals_set_updated_at
before update on public.journals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed the chart of accounts, GST rates, and the default bank for each org
-- ---------------------------------------------------------------------------

create or replace function private.seed_org_accounting(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bank_gl uuid;
begin
  if exists (
    select 1 from public.accounts a where a.org_id = target_org_id
  ) then
    return;
  end if;

  insert into public.accounts (org_id, code, name, account_type, is_group) values
    (target_org_id, '100000', 'Assets', 'asset', true),
    (target_org_id, '110000', 'Bank', 'asset', false),
    (target_org_id, '120000', 'Accounts Receivable', 'asset', false),
    (target_org_id, '130000', 'Inventory', 'asset', false),
    (target_org_id, '140000', 'Input GST', 'asset', false),
    (target_org_id, '200000', 'Liabilities', 'liability', true),
    (target_org_id, '210000', 'Accounts Payable', 'liability', false),
    (target_org_id, '220000', 'GST Payable', 'liability', false),
    (target_org_id, '300000', 'Equity', 'equity', true),
    (target_org_id, '310000', 'Share Capital', 'equity', false),
    (target_org_id, '320000', 'Retained Earnings', 'equity', false),
    (target_org_id, '400000', 'Revenue', 'revenue', true),
    (target_org_id, '410000', 'Sales', 'revenue', false),
    (target_org_id, '500000', 'Expenses', 'expense', true),
    (target_org_id, '510000', 'Operating Expenses', 'expense', false);

  update public.accounts child
  set parent_id = parent.id
  from public.accounts parent
  where child.org_id = target_org_id
    and parent.org_id = target_org_id
    and parent.is_group = true
    and (
      (parent.code = '100000' and child.code in ('110000', '120000', '130000', '140000'))
      or (parent.code = '200000' and child.code in ('210000', '220000'))
      or (parent.code = '300000' and child.code in ('310000', '320000'))
      or (parent.code = '400000' and child.code = '410000')
      or (parent.code = '500000' and child.code = '510000')
    );

  select a.id into bank_gl
  from public.accounts a
  where a.org_id = target_org_id
    and a.code = '110000';

  insert into public.bank_accounts (org_id, name, currency, gl_account_id)
  values (target_org_id, 'Primary operating account', 'INR', bank_gl);

  insert into public.tax_codes (org_id, name, rate) values
    (target_org_id, 'GST 0%', 0),
    (target_org_id, 'GST 5%', 5),
    (target_org_id, 'GST 12%', 12),
    (target_org_id, 'GST 18%', 18),
    (target_org_id, 'GST 28%', 28);
end;
$$;

create or replace function private.handle_new_organization_accounting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_org_accounting(new.id);
  return new;
end;
$$;

revoke all on function private.seed_org_accounting(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_organization_accounting() from public, anon, authenticated;
grant execute on function private.handle_new_organization_accounting() to authenticated;

create trigger organizations_seed_accounting
after insert on public.organizations
for each row
execute function private.handle_new_organization_accounting();

-- ---------------------------------------------------------------------------
-- Posted journals are the general ledger. Draft rows exist only inside posting.
-- ---------------------------------------------------------------------------

create or replace function public.protect_posted_journal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_status text;
begin
  if tg_table_name = 'journals' then
    if tg_op = 'DELETE' and old.status = 'posted' then
      raise exception 'Posted journals cannot be deleted';
    end if;
    if tg_op = 'UPDATE' and old.status = 'posted' then
      raise exception 'Posted journals cannot be changed';
    end if;
  else
    select j.status into parent_status
    from public.journals j
    where j.id = coalesce(old.journal_id, new.journal_id);

    if parent_status = 'posted' then
      raise exception 'Lines on a posted journal cannot be changed';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger journals_protect_posted
before update or delete on public.journals
for each row execute function public.protect_posted_journal();

create trigger journal_lines_protect_posted
before update or delete on public.journal_lines
for each row execute function public.protect_posted_journal();

create or replace function public.post_journal(
  p_posting_date date,
  p_description text,
  p_source text,
  p_source_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_existing uuid;
  v_journal uuid;
  v_number text;
  v_line jsonb;
  v_account uuid;
  v_debit numeric(18, 2);
  v_credit numeric(18, 2);
  v_debit_sum numeric(18, 2) := 0;
  v_credit_sum numeric(18, 2) := 0;
  v_description text;
  v_line_description text;
  v_count integer := 0;
begin
  v_org := private.user_org_id();
  if v_org is null then
    raise exception 'Sign in to an organization before posting a journal';
  end if;

  v_description := btrim(coalesce(p_description, ''));
  if char_length(v_description) < 3 or char_length(v_description) > 200 then
    raise exception 'Journal description must be between 3 and 200 characters';
  end if;

  if p_posting_date is null then
    raise exception 'Posting date is required';
  end if;

  if p_source not in ('manual', 'ap_bill', 'ar_invoice', 'ar_payment') then
    raise exception 'Unknown journal source';
  end if;

  if p_source = 'manual' and p_source_id is not null then
    raise exception 'A manual journal cannot reference another document';
  end if;

  if p_source <> 'manual' and p_source_id is null then
    raise exception 'This journal must reference its source document';
  end if;

  if p_source <> 'manual' then
    select j.id into v_existing
    from public.journals j
    where j.org_id = v_org
      and j.source = p_source
      and j.source_id = p_source_id
      and j.status = 'posted';

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'A journal needs at least two lines';
  end if;

  v_number := 'JE-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS-MS')
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);

  insert into public.journals (
    org_id,
    journal_number,
    posting_date,
    description,
    source,
    source_id,
    status,
    created_by
  ) values (
    v_org,
    v_number,
    p_posting_date,
    v_description,
    p_source,
    p_source_id,
    'draft',
    auth.uid()
  )
  returning id into v_journal;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_account := nullif(v_line->>'account_id', '')::uuid;
    v_debit := round(coalesce((v_line->>'debit')::numeric, 0), 2);
    v_credit := round(coalesce((v_line->>'credit')::numeric, 0), 2);
    v_line_description := btrim(coalesce(v_line->>'description', v_description));

    if v_account is null then
      raise exception 'Each journal line needs an account';
    end if;

    if not exists (
      select 1
      from public.accounts a
      where a.id = v_account
        and a.org_id = v_org
        and a.is_group = false
        and a.is_active = true
    ) then
      raise exception 'Journal lines can only post to an active account in your organization';
    end if;

    if v_debit < 0 or v_credit < 0 or (v_debit > 0 and v_credit > 0) or (v_debit = 0 and v_credit = 0) then
      raise exception 'Each journal line must be either a debit or a credit';
    end if;

    insert into public.journal_lines (journal_id, account_id, description, debit, credit)
    values (v_journal, v_account, left(v_line_description, 200), v_debit, v_credit);

    v_debit_sum := v_debit_sum + v_debit;
    v_credit_sum := v_credit_sum + v_credit;
    v_count := v_count + 1;
  end loop;

  if v_count < 2 then
    raise exception 'A journal needs at least two lines';
  end if;

  if v_debit_sum <> v_credit_sum or v_debit_sum <= 0 then
    raise exception 'Journal is out of balance. Debits % must equal credits %', v_debit_sum, v_credit_sum;
  end if;

  update public.journals
  set status = 'posted'
  where id = v_journal
    and status = 'draft';

  if not found then
    raise exception 'Journal could not be posted';
  end if;

  return v_journal;
end;
$$;

revoke all on function public.post_journal(date, text, text, uuid, jsonb) from public, anon;
grant execute on function public.post_journal(date, text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.tax_codes enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.journals enable row level security;
alter table public.journal_lines enable row level security;

create policy "accounts_select_same_org"
  on public.accounts for select to authenticated
  using (org_id = private.user_org_id());

create policy "accounts_insert_same_org"
  on public.accounts for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "accounts_update_same_org"
  on public.accounts for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "tax_codes_select_same_org"
  on public.tax_codes for select to authenticated
  using (org_id = private.user_org_id());

create policy "tax_codes_insert_same_org"
  on public.tax_codes for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "bank_accounts_select_same_org"
  on public.bank_accounts for select to authenticated
  using (org_id = private.user_org_id());

create policy "bank_accounts_insert_same_org"
  on public.bank_accounts for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "bank_accounts_update_same_org"
  on public.bank_accounts for update to authenticated
  using (org_id = private.user_org_id())
  with check (org_id = private.user_org_id());

create policy "journals_select_same_org"
  on public.journals for select to authenticated
  using (org_id = private.user_org_id());

create policy "journals_insert_same_org"
  on public.journals for insert to authenticated
  with check (org_id = private.user_org_id());

create policy "journals_update_same_org"
  on public.journals for update to authenticated
  using (org_id = private.user_org_id() and status = 'draft')
  with check (org_id = private.user_org_id());

create policy "journals_delete_draft_same_org"
  on public.journals for delete to authenticated
  using (org_id = private.user_org_id() and status = 'draft');

create policy "journal_lines_select_same_org"
  on public.journal_lines for select to authenticated
  using (
    exists (
      select 1
      from public.journals j
      where j.id = journal_id
        and j.org_id = private.user_org_id()
    )
  );

create policy "journal_lines_insert_same_org"
  on public.journal_lines for insert to authenticated
  with check (
    exists (
      select 1
      from public.journals j
      where j.id = journal_id
        and j.org_id = private.user_org_id()
        and j.status = 'draft'
    )
  );

create policy "journal_lines_delete_draft_same_org"
  on public.journal_lines for delete to authenticated
  using (
    exists (
      select 1
      from public.journals j
      where j.id = journal_id
        and j.org_id = private.user_org_id()
        and j.status = 'draft'
    )
  );

do $$
declare
  org record;
begin
  for org in select id from public.organizations
  loop
    perform private.seed_org_accounting(org.id);
  end loop;
end $$;
