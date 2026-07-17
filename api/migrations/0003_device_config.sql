-- Where the ESP32 is told to connect. Singleton, like settings: there is one transformer.
create table if not exists device_config (
    id integer primary key default 1,
    wifi_ssid text not null default 'DynaVolt-Field',
    wifi_password text not null default 'dynavolt2026',
    updated_at timestamptz not null default now(),
    constraint device_config_singleton check (id = 1)
);

insert into device_config (id) values (1) on conflict (id) do nothing;
