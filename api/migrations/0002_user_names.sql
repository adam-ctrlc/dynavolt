alter table users add column if not exists first_name text not null default '';
alter table users add column if not exists middle_name text;
alter table users add column if not exists last_name text not null default '';
