-- The coffee bar says what it is serving.
--
-- Three hot lattes, each written as a person would order it rather than as a
-- list of what goes in the cup. The full build stays on the drink's own
-- sheet, where somebody making it can read it; the card says vanilla latte,
-- cold foam, gold dust, which is what somebody drinking it wants to know.
--
-- The cold foams keep their name on purpose. They are cold foam on a hot
-- drink, which is the point of them, and the section says hot lattes above.

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
           when 'The Shine' then drink
             || jsonb_build_object(
                  'feel', 'The most popular.',
                  'short', 'Vanilla latte · Vanilla cold foam · Gold dust')
           when 'Honeycomb' then drink
             || jsonb_build_object(
                  'short', 'Honey brown sugar latte · Salted honey cold foam')
           when 'Northwoods' then drink
             || jsonb_build_object(
                  'short', 'Caramel latte · Whipped cream · Caramel drizzle')
           else drink
         end
         order by ordinality)
  into drinks
  from jsonb_array_elements(drinks) with ordinality as t(drink, ordinality);

/* Every drink got its line, and nobody lost their build or their artwork. */
select count(*) into moved
  from jsonb_array_elements(drinks) drink
 where drink ? 'short' and drink ? 'art' and jsonb_array_length(drink -> 'ingredients') = 5;
if moved <> 3 then
  raise exception 'coffee: % of 3 drinks are complete', moved;
end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,coffee}', drinks, true)
 where id = shine;
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'engagement: % rows', moved; end if;

end $migration$;
