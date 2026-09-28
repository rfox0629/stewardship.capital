-- The Honeycomb wears whipped cream now, and the Northwoods says what it is
-- for.
--
-- Salted honey cold foam is gone: the drink is finished with whipped cream, a
-- drizzle of honey and a sprinkle of brown sugar, and both the card and the
-- build say so. Its subheading changes with it, because "rich but
-- approachable" was describing the old cup.
--
-- The Northwoods keeps everything it had and gains a line that tells you when
-- to order it.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
  drinks jsonb;
begin

select reference -> 'guide' -> 'coffee' into drinks
  from public.engagements where id = shine;

if jsonb_array_length(drinks) <> 3 then
  raise exception 'coffee: expected 3 drinks, found %', jsonb_array_length(drinks);
end if;

select jsonb_agg(
         case drink ->> 'name'
           when 'Honeycomb' then drink
             || jsonb_build_object(
                  'feel', 'Sweet as honey, soft as cream.',
                  'short', 'Honey brown sugar latte · Whipped cream · Honey drizzle · Brown sugar',
                  'ingredients', jsonb_build_array(
                    'Espresso', 'Honey', 'Brown sugar', 'Milk',
                    'Whipped cream, a drizzle of honey, and a sprinkle of brown sugar'))
           when 'Northwoods' then drink
             || jsonb_build_object('feel', 'Settle in. Sip slow.')
           else drink
         end
         order by ordinality)
  into drinks
  from jsonb_array_elements(drinks) with ordinality as t(drink, ordinality);

/* Nothing of the old topping is left anywhere in the menu, and the Northwoods
   still has the five things it always had. */
if drinks::text ilike '%cold foam%' and drinks::text not ilike '%vanilla cold foam%' then
  raise exception 'coffee: a stale cold foam is still in the menu';
end if;
if drinks::text ilike '%salted honey%' or drinks::text ilike '%cinnamon%' then
  raise exception 'coffee: the old topping is still described';
end if;

select count(*) into moved
  from jsonb_array_elements(drinks) drink
 where jsonb_array_length(drink -> 'ingredients') = 5
   and drink ? 'short' and drink ? 'feel' and drink ? 'art';
if moved <> 3 then raise exception 'coffee: % of 3 drinks are complete', moved; end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,coffee}', drinks, true)
 where id = shine;
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'engagement: % rows', moved; end if;

end $migration$;
