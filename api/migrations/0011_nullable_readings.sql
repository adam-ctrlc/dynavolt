alter table readings alter column voltage_v drop not null;
alter table readings alter column current_a drop not null;
alter table readings alter column temperature_c drop not null;
alter table readings alter column apparent_power_va drop not null;
