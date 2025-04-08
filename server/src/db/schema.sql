-- Enable Row Level Security
alter table auth.users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view their own clients" on public.clients;
drop policy if exists "Users can create their own clients" on public.clients;
drop policy if exists "Users can update their own clients" on public.clients;
drop policy if exists "Users can delete their own clients" on public.clients;
drop policy if exists "Users can view their own invoices" on public.invoices;
drop policy if exists "Users can create their own invoices" on public.invoices;
drop policy if exists "Users can update their own invoices" on public.invoices;
drop policy if exists "Users can delete their own invoices" on public.invoices;
drop policy if exists "Users can view their own invoice items" on public.invoice_items;
drop policy if exists "Users can create their own invoice items" on public.invoice_items;
drop policy if exists "Users can update their own invoice items" on public.invoice_items;
drop policy if exists "Users can delete their own invoice items" on public.invoice_items;
drop policy if exists "Users can view their own payments" on public.payments;
drop policy if exists "Users can create their own payments" on public.payments;
drop policy if exists "Users can update their own payments" on public.payments;

-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    role text not null default 'user',
    name text,
    company_name text,
    company_address text,
    company_phone text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create clients table if it doesn't exist
create table if not exists public.clients (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    email text,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on clients
alter table public.clients enable row level security;

-- Create invoices table if it doesn't exist
create table if not exists public.invoices (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    client_id uuid references public.clients on delete set null,
    invoice_number text not null,
    status text not null default 'draft',
    issue_date date not null default current_date,
    due_date date,
    subtotal decimal(10,2) not null default 0,
    tax_rate decimal(5,2) default 0,
    tax_amount decimal(10,2) default 0,
    total decimal(10,2) not null default 0,
    notes text,
    terms text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on invoices
alter table public.invoices enable row level security;

-- Create invoice_items table if it doesn't exist
create table if not exists public.invoice_items (
    id uuid default uuid_generate_v4() primary key,
    invoice_id uuid references public.invoices on delete cascade not null,
    description text not null,
    quantity decimal(10,2) not null default 1,
    unit_price decimal(10,2) not null default 0,
    amount decimal(10,2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on invoice_items
alter table public.invoice_items enable row level security;

-- Create payments table if it doesn't exist
create table if not exists public.payments (
    id uuid default uuid_generate_v4() primary key,
    invoice_id uuid references public.invoices on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    amount decimal(10,2) not null,
    payment_method text not null,
    status text not null default 'pending',
    payment_intent_id text,
    transaction_id text,
    error text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- Create RLS Policies

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Clients policies
create policy "Users can view their own clients"
    on public.clients for select
    using (auth.uid() = user_id);

create policy "Users can create their own clients"
    on public.clients for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own clients"
    on public.clients for update
    using (auth.uid() = user_id);

create policy "Users can delete their own clients"
    on public.clients for delete
    using (auth.uid() = user_id);

-- Invoices policies
create policy "Users can view their own invoices"
    on public.invoices for select
    using (auth.uid() = user_id);

create policy "Users can create their own invoices"
    on public.invoices for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own invoices"
    on public.invoices for update
    using (auth.uid() = user_id);

create policy "Users can delete their own invoices"
    on public.invoices for delete
    using (auth.uid() = user_id);

-- Invoice items policies
create policy "Users can view their own invoice items"
    on public.invoice_items for select
    using (
        exists (
            select 1 from public.invoices
            where invoices.id = invoice_items.invoice_id
            and invoices.user_id = auth.uid()
        )
    );

create policy "Users can create their own invoice items"
    on public.invoice_items for insert
    with check (
        exists (
            select 1 from public.invoices
            where invoices.id = invoice_items.invoice_id
            and invoices.user_id = auth.uid()
        )
    );

create policy "Users can update their own invoice items"
    on public.invoice_items for update
    using (
        exists (
            select 1 from public.invoices
            where invoices.id = invoice_items.invoice_id
            and invoices.user_id = auth.uid()
        )
    );

create policy "Users can delete their own invoice items"
    on public.invoice_items for delete
    using (
        exists (
            select 1 from public.invoices
            where invoices.id = invoice_items.invoice_id
            and invoices.user_id = auth.uid()
        )
    );

-- Payments policies
create policy "Users can view their own payments"
    on public.payments for select
    using (auth.uid() = user_id);

create policy "Users can create their own payments"
    on public.payments for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own payments"
    on public.payments for update
    using (auth.uid() = user_id);

-- Drop existing functions and triggers
drop function if exists public.generate_invoice_number() cascade;
drop function if exists public.update_invoice_totals() cascade;

-- Create functions

-- Function to handle invoice numbering
create or replace function public.generate_invoice_number()
returns trigger as $$
declare
    year text;
    next_number integer;
    invoice_number text;
begin
    -- Get current year
    year := to_char(current_date, 'YYYY');
    
    -- Get next number for this year
    select coalesce(max(cast(split_part(invoice_number, '-', 2) as integer)), 0) + 1
    into next_number
    from public.invoices
    where invoice_number like year || '-%';
    
    -- Generate invoice number (YYYY-NNNN format)
    invoice_number := year || '-' || lpad(next_number::text, 4, '0');
    
    -- Set the invoice number
    NEW.invoice_number := invoice_number;
    
    return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger for invoice numbering
create trigger set_invoice_number
    before insert on public.invoices
    for each row
    when (NEW.invoice_number is null)
    execute function public.generate_invoice_number();

-- Function to update invoice totals
create or replace function public.update_invoice_totals()
returns trigger as $$
begin
    -- Update invoice totals
    update public.invoices
    set 
        subtotal = (
            select coalesce(sum(amount), 0)
            from public.invoice_items
            where invoice_id = NEW.invoice_id
        ),
        updated_at = now()
    where id = NEW.invoice_id;
    
    -- Get the updated invoice
    select * into NEW from public.invoices where id = NEW.invoice_id;
    
    return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers for invoice totals
create trigger update_invoice_totals_insert
    after insert on public.invoice_items
    for each row
    execute function public.update_invoice_totals();

create trigger update_invoice_totals_update
    after update of quantity, unit_price, amount on public.invoice_items
    for each row
    execute function public.update_invoice_totals();

create trigger update_invoice_totals_delete
    after delete on public.invoice_items
    for each row
    execute function public.update_invoice_totals();
