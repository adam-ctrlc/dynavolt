-- The PZEM-004T v3 already reports real power, energy, frequency and power factor,
-- and the DHT22 reports humidity. Nullable: rows recorded before this migration
-- have none of them, and a sensor may omit any field.
alter table readings add column if not exists power_w double precision;
alter table readings add column if not exists power_factor double precision;
alter table readings add column if not exists frequency_hz double precision;
alter table readings add column if not exists energy_kwh double precision;
alter table readings add column if not exists humidity_pct double precision;
