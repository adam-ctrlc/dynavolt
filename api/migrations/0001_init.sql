create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    role text not null check (role in ('admin', 'user')),
    created_at timestamptz not null default now()
);

create table if not exists settings (
    id integer primary key default 1,
    load_threshold_va double precision not null default 900,
    temp_threshold_c double precision not null default 40,
    updated_at timestamptz not null default now(),
    constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists readings (
    id bigserial primary key,
    voltage_v double precision not null,
    current_a double precision not null,
    temperature_c double precision not null,
    apparent_power_va double precision not null,
    status text not null check (status in ('normal', 'overload')),
    source text not null default 'simulator',
    recorded_at timestamptz not null default now()
);

create index if not exists readings_recorded_at_idx on readings (recorded_at desc);

create table if not exists alerts (
    id bigserial primary key,
    reading_id bigint references readings (id) on delete set null,
    kind text not null check (kind in ('overload', 'temperature')),
    message text not null,
    value double precision not null,
    threshold double precision not null,
    created_at timestamptz not null default now(),
    acknowledged_at timestamptz,
    acknowledged_by uuid references users (id) on delete set null,
    response_ms bigint
);

create index if not exists alerts_created_at_idx on alerts (created_at desc);
create index if not exists alerts_active_idx on alerts (acknowledged_at) where acknowledged_at is null;
