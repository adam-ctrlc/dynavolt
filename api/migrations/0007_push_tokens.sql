-- Expo push tokens, one row per device per account.
--
-- The token is the primary key: Expo reissues the same token to the same install,
-- so a re-register updates the owner rather than creating a duplicate. Deleting the
-- account takes its tokens with it, otherwise a revoked user keeps getting alerts.
create table if not exists push_tokens (
    token text primary key,
    user_id uuid not null references users (id) on delete cascade,
    platform text not null default 'unknown',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on push_tokens (user_id);

drop trigger if exists push_tokens_set_updated_at on push_tokens;
create trigger push_tokens_set_updated_at
    before update on push_tokens
    for each row execute function set_updated_at();
