-- Coffee leaves breakfast and gets its own half hour.
--
-- Brewed coffee and hot tea are out from 7:30, half an hour before anything
-- is served, so somebody up early has a reason to come down. That is its own
-- line on both guides rather than a word in the breakfast title, and
-- breakfast becomes Breakfast.
--
-- What this row is not: the coffee bar. The bar is the three signature
-- lattes, it is staffed, and the guides publish its hours off four rows
-- marked in the guest copy. This row is a pot and a kettle and carries no
-- such mark, so the published hours do not move. That is asserted below,
-- because marking it would silently rewrite the hours on both guides.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  fri_breakfast constant uuid := '98992a00-9a21-48ec-8b68-9a14aac8e3ff';
  sat_breakfast constant uuid := '514d14f4-14ec-423f-acba-e6da7d1df9c3';
  fri_hot constant uuid := 'e0d0fcd8-bccc-44dc-9558-4c0afa0fd4c8';
  sat_hot constant uuid := '9810f429-ce4f-4e16-858d-773c53448c45';
  card jsonb;
  touched integer;
begin

/* ------------------------------------------- breakfast becomes breakfast */

select count(*) into touched
  from public.schedule_items s
 where s.id in (fri_breakfast, sat_breakfast)
   and s.engagement_id = shine
   and s.title = 'Breakfast and coffee'
   and s.starts_label = '8:00 am' and s.ends_label = '8:45 am';
if touched <> 2 then
  raise exception 'breakfast: expected both rows, matched %', touched;
end if;

update public.schedule_items set title = 'Breakfast'
 where id in (fri_breakfast, sat_breakfast);
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'breakfast title: % rows', touched; end if;

/* The coffee comes off both menus. Friday lists it on its own; Saturday
   pairs it with the juice, which stays. */
update public.schedule_items
   set guest_guide = jsonb_set(guest_guide, '{menu}',
         (select jsonb_agg(item order by ordinality)
            from jsonb_array_elements_text(guest_guide -> 'menu') with ordinality as t(item, ordinality)
           where item <> 'Freshly brewed coffee'), true)
 where id = fri_breakfast;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'friday menu: % rows', touched; end if;

update public.schedule_items
   set guest_guide = jsonb_set(guest_guide, '{menu}',
         (select jsonb_agg(case when item = 'Coffee and orange juice' then 'Orange juice' else item end
                           order by ordinality)
            from jsonb_array_elements_text(guest_guide -> 'menu') with ordinality as t(item, ordinality)), true)
 where id = sat_breakfast;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'saturday menu: % rows', touched; end if;

if exists (
  select 1 from public.schedule_items s
   where s.id in (fri_breakfast, sat_breakfast) and s.guest_guide::text ilike '%coffee%'
) then
  raise exception 'breakfast: coffee is still on a breakfast menu';
end if;

if (select jsonb_array_length(guest_guide -> 'menu') from public.schedule_items where id = fri_breakfast) <> 5
   or (select jsonb_array_length(guest_guide -> 'menu') from public.schedule_items where id = sat_breakfast) <> 4 then
  raise exception 'breakfast: a menu lost more than its coffee';
end if;

/* -------------------------------------------------- the half hour before */

if exists (select 1 from public.schedule_items where id in (fri_hot, sat_hot)) then
  raise exception 'hot drinks: the rows already exist';
end if;

insert into public.schedule_items
  (id, engagement_id, day_key, starts_label, ends_label, title, track, status,
   position, daypart, display_mode, audience)
values
  (fri_hot, shine, 'fri', '7:30 am', '8:00 am', 'Hot tea and coffee',
   'Operations', 'confirmed', 84, 'morning', 'normal', 'everyone'),
  (sat_hot, shine, 'sat', '7:30 am', '8:00 am', 'Hot tea and coffee',
   'Operations', 'confirmed', 85, 'morning', 'normal', 'everyone');
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'hot drinks: % rows', touched; end if;

insert into public.schedule_item_ops (schedule_item_id, engagement_id, detail)
select id, shine, jsonb_build_object(
         'duty', false,
         'category', 'operations',
         'purpose', 'Brewed coffee and hot tea out before breakfast.')
  from unnest(array[fri_hot, sat_hot]) as id;
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'hot drinks ops: % rows', touched; end if;

/* ------------------------------------------------- the printed guest card */

/* Breakfast loses the word on the card too, and the new half hour gets a
   line of its own on each morning, in the card's own title case. */
select jsonb_agg(line order by ordinality) into card
  from (
    select case
             when line ->> 'momentId' in (fri_breakfast::text, sat_breakfast::text)
             then jsonb_set(line, '{title}', to_jsonb('Breakfast'::text), true)
             else line end as line,
           ordinality
      from public.engagements e,
           jsonb_array_elements(e.reference -> 'guide' -> 'schedule') with ordinality as t(line, ordinality)
     where e.id = shine
    union all
    select jsonb_build_object(
             'day', day_key, 'starts', '7:30 am', 'ends', '8:00 am',
             'title', 'Hot Tea and Coffee', 'momentId', id::text), 1000
      from (values ('fri', fri_hot), ('sat', sat_hot)) as added(day_key, id)
  ) as lines;

if card is null then raise exception 'card: nothing to write'; end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,schedule}', card, true)
 where id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'card: % rows', touched; end if;

/* ------------------------------------------------------------ agreement */

select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine and line ->> 'title' = 'Hot Tea and Coffee'
   and line ->> 'starts' = '7:30 am' and line ->> 'ends' = '8:00 am';
if touched <> 2 then raise exception 'card: % hot drink lines', touched; end if;

select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine and line ->> 'title' ilike '%breakfast and coffee%';
if touched <> 0 then raise exception 'card: % lines still say breakfast and coffee', touched; end if;

/* The published coffee bar hours are untouched: still four windows, and the
   new rows are not among them. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

if exists (
  select 1 from public.schedule_items s
   where s.id in (fri_hot, sat_hot)
     and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee')
) then
  raise exception 'hot drinks: a pot of coffee is publishing coffee bar hours';
end if;

end $migration$;
