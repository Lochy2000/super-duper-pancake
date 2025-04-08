-- Enable RLS (Row Level Security)
alter table auth.users enable row level security;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create policy to allow users to read their own profile
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- Create policy to allow users to update their own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Create clients table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  email text not null,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on clients
alter table public.clients enable row level security;

-- Create policy to allow users to read their own clients
create policy "Users can view own clients"
  on clients for select
  using ( auth.uid() = user_id );

-- Create policy to allow users to insert their own clients
create policy "Users can insert own clients"
  on clients for insert
  with check ( auth.uid() = user_id );

-- Create policy to allow users to update their own clients
create policy "Users can update own clients"
  on clients for update
  using ( auth.uid() = user_id );

-- Create policy to allow users to delete their own clients
create policy "Users can delete own clients"
  on clients for delete
  using ( auth.uid() = user_id );

-- Create invoices table
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  client_id uuid references public.clients not null,
  invoice_number text unique not null,
  status text not null default 'draft',
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  due_date date not null,
  paid_date timestamp with time zone,
  payment_method text,
  payment_status text not null default 'unpaid',
  notes text,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on invoices
alter table public.invoices enable row level security;

-- Create policy to allow users to read their own invoices
create policy "Users can view own invoices"
  on invoices for select
  using ( auth.uid() = user_id );

-- Create policy to allow users to insert their own invoices
create policy "Users can insert own invoices"
  on invoices for insert
  with check ( auth.uid() = user_id );

-- Create policy to allow users to update their own invoices
create policy "Users can update own invoices"
  on invoices for update
  using ( auth.uid() = user_id );

-- Create policy to allow users to delete their own invoices
create policy "Users can delete own invoices"
  on invoices for delete
  using ( auth.uid() = user_id );

-- Create payments table
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices not null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  payment_method text not null,
  payment_status text not null,
  transaction_id text,
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- Create policy to allow users to read payments for their invoices
create policy "Users can view payments for own invoices"
  on payments for select
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert payments for their invoices
create policy "Users can insert payments for own invoices"
  on payments for insert
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- Create functions to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.clients
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.invoices
  for each row
  execute function public.handle_updated_at();
