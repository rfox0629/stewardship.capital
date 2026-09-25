-- The menus read the same way throughout, and Sunday is back on the card.
--
-- Three words in the middle of a dish were capitalised while everything
-- around them was not, so they are lowered to match: a menu should look like
-- one voice wrote it. The coffee stops naming the roaster, which is a detail
-- for the people buying it rather than the people drinking it.
--
-- And Sunday returns. The card printed three days, but a guest still has to
-- pack and there is breakfast to take with them, so the guide says so: the
-- same two things the working calendar already has, in the card's words.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
  lines jsonb;
begin

/* ----------------------------------------------------------- the menus */

update public.schedule_items s
   set guest_guide = jsonb_set(s.guest_guide, '{menu}', (
         select jsonb_agg(
                  case item
                    when 'Fresh English muffin toast' then 'Fresh english muffin toast'
                    when 'Freshly brewed coffee from The Dock Coffee' then 'Freshly brewed coffee'
                    when 'Hot honey Brussels sprouts with bacon' then 'Hot honey brussels sprouts with bacon'
                    when 'House-made ranch, French and vinaigrette' then 'House-made ranch, french and vinaigrette'
                    else item
                  end
                  order by ordinality)
           from jsonb_array_elements_text(s.guest_guide -> 'menu') with ordinality as t(item, ordinality)
       ))
 where s.engagement_id = shine
   and s.guest_guide ? 'menu'
   and s.guest_guide::text ~ '(English muffin|The Dock Coffee|Brussels sprouts|, French and)';
get diagnostics moved = row_count;
if moved <> 3 then raise exception 'menus: expected 3 rows, changed %', moved; end if;

select count(*) into moved
  from public.schedule_items s, jsonb_array_elements_text(s.guest_guide -> 'menu') item
 where s.engagement_id = shine
   and (item ~ 'Dock Coffee' or item ~ '[a-z] [A-Z]');
if moved <> 0 then
  raise exception 'menus: % items still read unevenly', moved;
end if;

/* ---------------------------------------------------------- and Sunday */

select reference -> 'guide' -> 'schedule' into lines
  from public.engagements where id = shine;

if jsonb_array_length(lines) <> 15 then
  raise exception 'card: expected the 15 printed lines, found %', jsonb_array_length(lines);
end if;

lines := lines
  || jsonb_build_array(
       jsonb_build_object(
         'day', 'sun', 'starts', '7:30 am', 'ends', '8:30 am', 'title', 'Breakfast To Go',
         'momentId', (select id::text from public.schedule_items
                       where engagement_id = shine and day_key = 'sun'
                         and title = 'Grab-and-go breakfast')),
       jsonb_build_object(
         'day', 'sun', 'starts', '8:30 am', 'ends', '9:00 am', 'title', 'Packing and Departures')
     );

if (select count(*) from jsonb_array_elements(lines) line
     where line ->> 'day' = 'sun' and line ? 'momentId') <> 1 then
  raise exception 'sunday: the breakfast line lost its menu';
end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,schedule}', lines, true)
 where id = shine;
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'engagement: % rows', moved; end if;

end $migration$;
