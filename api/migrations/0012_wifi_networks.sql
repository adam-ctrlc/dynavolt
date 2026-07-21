-- Multiple stored Wi-Fi networks. The board polls the full prioritised list and
-- fails over down it; the admin app selects the preferred one. At most one row may
-- be the compiled-in default and at most one may be selected, enforced by partial
-- unique indexes. Seeded from the old singleton device_config, which is then dropped.
create table if not exists wifi_networks (
    id bigint generated always as identity primary key,
    ssid text not null,
    password text not null default '',
    is_default boolean not null default false,
    selected boolean not null default false,
    updated_at timestamptz not null default now(),
    constraint wifi_networks_ssid_unique unique (ssid)
);

create unique index if not exists wifi_networks_one_default on wifi_networks (is_default) where is_default;
create unique index if not exists wifi_networks_one_selected on wifi_networks (selected) where selected;

insert into wifi_networks (ssid, password, selected, updated_at)
select wifi_ssid, wifi_password, true, updated_at from device_config where id = 1
on conflict (ssid) do nothing;

drop table if exists device_config;
