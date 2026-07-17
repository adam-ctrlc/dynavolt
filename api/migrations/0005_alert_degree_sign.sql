-- Alert text is written when the alert is raised, so rows created before the
-- degree sign was added keep reading "40.2 C". Anchored to the end of the
-- string so only the unit is touched.
update alerts
set message = regexp_replace(message, ' C$', ' °C')
where kind = 'temperature' and message like '% C';
