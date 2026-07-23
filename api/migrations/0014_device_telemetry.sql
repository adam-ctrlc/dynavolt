create table if not exists device_telemetry (
    id integer primary key default 1,
    device_id text,
    firmware text,
    ssid text,
    ip_address text,
    signal_dbm integer,
    uptime_seconds bigint,
    reported_at timestamptz not null default now(),
    constraint device_telemetry_singleton check (id = 1)
);

insert into device_telemetry (id) values (1) on conflict (id) do nothing;
