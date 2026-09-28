-- Sharpies are not a proper noun here.
--
-- Mid-sentence capitals on a setup line read as a mistake rather than as a
-- brand, and the rest of these lines are plain: rope, scissors, stakes. Both
-- rows that name them are fixed, so the weekend does not say it two ways.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  touched integer;
begin

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}',
                          to_jsonb(replace(o.detail ->> 'materials', 'Sharpies', 'sharpies')), true),
       updated_at = now()
 where o.engagement_id = shine
   and (o.detail ->> 'materials') like '%Sharpies%';
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'sharpies: expected 2 rows, updated %', touched; end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text ilike '%sharpie%';
if touched <> 2 then raise exception 'sharpies: % rows still name them', touched; end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Sharpies%';
if touched <> 0 then raise exception 'sharpies: % rows still capitalise them', touched; end if;

end $migration$;
