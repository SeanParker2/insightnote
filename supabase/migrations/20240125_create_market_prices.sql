create table if not exists market_prices (
  symbol text primary key,
  name text not null,
  price numeric,
  change_percent numeric,
  updated_at timestamptz default now()
);

alter table market_prices enable row level security;

create policy "Allow public read access"
  on market_prices for select
  using (true);

create policy "Allow service role update access"
  on market_prices for all
  using (auth.role() = 'service_role');
