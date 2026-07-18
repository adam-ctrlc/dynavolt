-- Alert text is written when the alert is raised, so rows created before the
-- messages were sentence cased still read "temperature reached ...". Capitalise
-- the first character. Idempotent: upper() of an already-uppercase letter is itself.
update alerts
set message = upper(left(message, 1)) || substring(message from 2)
where message ~ '^[a-z]';
