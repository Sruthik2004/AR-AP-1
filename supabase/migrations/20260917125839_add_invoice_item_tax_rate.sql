-- Per-line tax rate (%) for invoice items (GST selection)

alter table public.invoice_items
  add column if not exists tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100);

comment on column public.invoice_items.tax_rate is
  'GST/tax percent applied to quantity × unit_price before computing line_total';
