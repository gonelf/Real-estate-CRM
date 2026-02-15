-- Leads table for storing uploaded/detected leads
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  property_id text not null,
  name text not null,
  email text,
  phone text,
  address text,
  status text not null default 'maybe' check (status in ('good', 'maybe', 'bad')),
  source text default 'upload',
  raw_data jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table leads enable row level security;

-- Policy: allow all operations for authenticated users
create policy "Authenticated users can manage leads"
  on leads for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policy: allow all operations for anon users (for development)
create policy "Anon users can manage leads"
  on leads for all
  using (auth.role() = 'anon')
  with check (auth.role() = 'anon');

-- Index for fast property lookups
create index if not exists idx_leads_property_id on leads (property_id);
