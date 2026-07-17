-- Every table carries created_at and updated_at.
--
-- updated_at is maintained by a trigger rather than by each query: a column that
-- depends on every writer remembering to set it will eventually be wrong, and it
-- is the kind of wrong nobody notices.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

alter table users add column if not exists updated_at timestamptz not null default now();
alter table settings add column if not exists created_at timestamptz not null default now();
alter table alerts add column if not exists updated_at timestamptz not null default now();
alter table device_config add column if not exists created_at timestamptz not null default now();

-- readings already timestamps the measurement itself with recorded_at, which is
-- when the sensor read it. created_at is when the row landed; the two differ if a
-- board buffers while offline and backfills later.
alter table readings add column if not exists created_at timestamptz not null default now();
alter table readings add column if not exists updated_at timestamptz not null default now();

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
    before update on users
    for each row execute function set_updated_at();

drop trigger if exists settings_set_updated_at on settings;
create trigger settings_set_updated_at
    before update on settings
    for each row execute function set_updated_at();

drop trigger if exists alerts_set_updated_at on alerts;
create trigger alerts_set_updated_at
    before update on alerts
    for each row execute function set_updated_at();

drop trigger if exists device_config_set_updated_at on device_config;
create trigger device_config_set_updated_at
    before update on device_config
    for each row execute function set_updated_at();

drop trigger if exists readings_set_updated_at on readings;
create trigger readings_set_updated_at
    before update on readings
    for each row execute function set_updated_at();
