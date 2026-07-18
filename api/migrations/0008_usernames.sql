-- Usernames, with the generation formula living in the database.
--
-- The formula: first initial + last name, lowercased and stripped of anything
-- that is not a letter or digit, then a number appended until it is unique. So
-- "John Adam Cuenca" becomes "jcuenca", and a second J. Cuenca becomes "jcuenca2".

create or replace function generate_username(first_name text, last_name text)
returns text
language plpgsql
as $$
declare
    base text;
    candidate text;
    suffix int := 1;
begin
    base := lower(regexp_replace(
        left(coalesce(first_name, ''), 1) || coalesce(last_name, ''),
        '[^a-zA-Z0-9]', '', 'g'
    ));

    if base = '' then
        base := 'user';
    end if;

    candidate := base;

    -- Later statements in a transaction see earlier ones, so backfilling several
    -- rows in a loop still yields distinct names.
    while exists (select 1 from users where username = candidate) loop
        suffix := suffix + 1;
        candidate := base || suffix::text;
    end loop;

    return candidate;
end;
$$;

alter table users add column if not exists username text;

-- Backfill existing accounts one at a time, so each sees the ones already named.
do $$
declare
    row record;
begin
    for row in select id, first_name, last_name from users where username is null loop
        update users
        set username = generate_username(row.first_name, row.last_name)
        where id = row.id;
    end loop;
end;
$$;

alter table users alter column username set not null;
create unique index if not exists users_username_key on users (username);
