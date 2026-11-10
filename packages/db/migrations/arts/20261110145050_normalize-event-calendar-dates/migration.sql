-- Repair calendar days exported as local-midnight epoch milliseconds.
-- Valid YYYY-MM-DD values and newly created events are left unchanged.
UPDATE events
SET date = strftime('%Y-%m-%d', CAST(date AS REAL) / 1000, 'unixepoch')
WHERE length(date) = 13 AND date NOT GLOB '*[^0-9]*';
