-- Two Friday rows at half past eleven.
--
-- Johnny takes the bathrooms from Scott, and Mike takes the transition into
-- the word from Ryan, which is the same handoff Mike now makes on Thursday.
--
-- Only the Friday bathroom row. Saturday has an identical one, same title,
-- same half hour, same Alice leading and same Scott on it, and it was not
-- part of what was asked for. It is counted below so it cannot be caught by
-- accident, and it is worth a decision of its own.
--
-- Two rows still read "Ryan transition": the Friday impact hour and the
-- Saturday vision message. Also counted, also worth deciding.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  bathrooms constant uuid := '9359a475-11ad-5e75-adec-146d1f912d14';
  word constant uuid := '2c7f67e3-6f5d-4da4-98b9-c72586f89459';
  touched integer;
begin

/* ------------------------------------------------------------ bathrooms */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = bathrooms
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Morning bathroom cleaning (during session)'
   and o.detail ->> 'support' = 'Scott';
if touched <> 1 then
  raise exception 'bathrooms: expected the Friday 11:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb('Johnny'::text), true),
       updated_at = now()
 where o.schedule_item_id = bathrooms;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'bathrooms: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = bathrooms
     and s.starts_label = '11:30 am' and s.ends_label = '12:00 pm'
     and o.detail ->> 'owner' = 'Alice'
     and o.detail ->> 'support' = 'Johnny'
) then
  raise exception 'bathrooms: the row did not come back the way it went in';
end if;

/* The Saturday twin is untouched and still on Scott. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'sat'
     and s.title = 'Morning bathroom cleaning (during session)'
     and o.detail ->> 'support' = 'Scott'
) then
  raise exception 'bathrooms: the Saturday row moved';
end if;

/* ----------------------------------------------------------------- word */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = word
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Word from Sammy and Suzanne'
   and o.detail ->> 'support' = 'Ryan transition; Junior coverage';
if touched <> 1 then
  raise exception 'word: expected the Friday 11:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}',
                          to_jsonb('Mike transition; Junior coverage'::text), true),
       updated_at = now()
 where o.schedule_item_id = word;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'word: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = word
     and s.starts_label = '11:30 am' and s.ends_label = '12:00 pm'
     and o.detail ->> 'owner' = 'Sammy and Suzanne'
     and o.detail ->> 'support' = 'Mike transition; Junior coverage'
     and o.detail ->> 'notes' = 'Release to lunch.'
) then
  raise exception 'word: the row did not come back the way it went in';
end if;

/* Scott and Ryan are off these rows and still on the weekend. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Scott%';
if touched < 4 then
  raise exception 'roster: Scott is down to % rows, which is not a removal from one', touched;
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'support') like 'Ryan transition%';
if touched <> 2 then
  raise exception 'transitions: expected 2 rows still on Ryan, found %', touched;
end if;

end $migration$;
