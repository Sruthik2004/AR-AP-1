-- Add phone number to contacts for vendor/customer directory

alter table public.contacts
  add column if not exists phone text;

comment on column public.contacts.phone is 'Primary phone number for the contact';
