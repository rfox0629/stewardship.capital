-- The SHINE weekend, reconciled and published as a guide.
--
-- Three sources, one calendar:
--
--   the current tentative schedule (screenshot, 21 September)   the guest
--       program and every word of the menus
--   SHINE_Founders_Weekend_2026_Run_of_Show.xlsx                owners,
--       support, setup, next cues, and the team only blocks around guests
--   SHINE_Volunteer_Tracker.xlsx                                individual
--       volunteer duties, including the bathroom rotation
--
-- The rule for disagreements, applied the same way everywhere: where the
-- schedule and the workbook agree, the calendar is brought into line with
-- them. Where they disagree with each other, the calendar keeps what it
-- already says and the disagreement is written down for Ryan rather than
-- settled here. Rows marked Locked in the workbook get no extra weight.
--
-- The Run of Show and Team Calendar sheets describe the same events twice.
-- Only the Run of Show sheet is used, so nothing is imported twice. The
-- workbook's Volunteer Assignments sheet is not used either: the tracker is
-- the corrected source for who does what. Kida is Keta throughout.
--
-- Every change to an existing moment is addressed by id and guarded on what
-- it currently says, so a hand edit made since is left alone and reported,
-- and running this twice changes nothing.

do $$
declare
  eng uuid;
  n integer;
  total_updates integer := 0;
  total_new integer := 0;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to do';
    return;
  end if;

  /* ================================================ existing moments */

  -- Wednesday: the team's day, not a guest's.
  update public.schedule_items set title = 'Team arrival window', starts_label = '7:30 am',
         ends_label = '3:30 pm', audience = 'planner'
   where id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201' and engagement_id = eng
     and title = 'Team Arrival' and starts_label = '10:00 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  -- Thursday setup: team only, and over before guests arrive.
  update public.schedule_items
     set title = 'Final setup, guest arrival preparation and devotional time',
         starts_label = '7:30 am', ends_label = '4:00 pm', audience = 'planner'
   where id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9101' and engagement_id = eng
     and title = 'Final setup and guest arrival preparation' and starts_label = '7:00 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  -- The opening meal, which the icebreaker used to share a row with.
  update public.schedule_items set title = 'Appetizers and dessert', starts_label = '5:30 pm',
         ends_label = '6:30 pm', track = 'Meals'
   where id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102' and engagement_id = eng
     and title = 'Appetizers and fellowship (Ice Breaker Game)' and starts_label = '4:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  -- Friday.
  update public.schedule_items set title = 'Breakfast', starts_label = '7:30 am', ends_label = '9:00 am'
   where id = '98992a00-9a21-48ec-8b68-9a14aac8e3ff' and engagement_id = eng
     and title = 'Breakfast: Eggs' and starts_label = '7:00 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set title = 'Devotional: Tito'
   where id = 'c6c6dabc-a9cf-42ef-b5f1-01c194251f6c' and engagement_id = eng
     and title = 'Devotional' and starts_label = '9:20 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set title = 'Gusii Land recap: Mike and Victor'
   where id = 'ecad74c7-cf11-42b1-b171-05aad9563850' and engagement_id = eng
     and title = 'Gusii land recap: Mike, Victor, and Keta';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set ends_label = '1:00 pm'
   where id = '8c658bb2-d05c-4db9-b514-babc9bfdc251' and engagement_id = eng
     and title = 'Lunch' and starts_label = '12:00 pm' and ends_label is null;
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set ends_label = '5:00 pm'
   where id = '98dc6592-07ac-4a22-bc56-e3c414be1a9b' and engagement_id = eng
     and title = 'Free time' and ends_label = '4:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set starts_label = '5:30 pm', ends_label = '6:30 pm'
   where id = '761ace4d-76eb-41c1-a90c-7687d0783737' and engagement_id = eng
     and title = 'Dinner' and starts_label = '5:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set starts_label = '7:00 pm'
   where id = '463fec53-6bef-42d4-b25e-31bcbb96256d' and engagement_id = eng
     and title = 'Worship' and starts_label = '6:30 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set title = 'Impact: Rev. Canana and videos'
   where id = '752801c2-1d94-4ecd-9358-b479f14e3ff5' and engagement_id = eng
     and title = 'Impact: Rev. Canna and videos';
  get diagnostics n = row_count; total_updates := total_updates + n;

  -- Saturday.
  update public.schedule_items set title = 'Breakfast', starts_label = '7:30 am', ends_label = '9:00 am'
   where id = '514d14f4-14ec-423f-acba-e6da7d1df9c3' and engagement_id = eng
     and title = 'Breakfast and coffee' and starts_label = '7:00 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set ends_label = '1:00 pm'
   where id = 'ebb5c598-57ce-4c1e-be22-fd23ddfb5b86' and engagement_id = eng
     and title = 'Lunch' and starts_label = '12:00 pm' and ends_label is null;
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set ends_label = '5:00 pm'
   where id = '56aa5c99-767d-4281-988c-8be40de8e17e' and engagement_id = eng
     and title = 'Free time' and ends_label = '4:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set starts_label = '5:30 pm', ends_label = '6:30 pm'
   where id = '1b2e2eaa-61e6-464d-9cd3-5193e65af702' and engagement_id = eng
     and title = 'Dinner' and starts_label = '5:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set title = 'Celebration: bonfires, games and desserts',
         starts_label = '7:00 pm', ends_label = '10:00 pm'
   where id = 'eb513b79-1a91-4c48-9663-c890ce38c3a0' and engagement_id = eng
     and title = 'Celebration: concert, bonfires, games, trivia, desserts' and starts_label = '6:00 pm';
  get diagnostics n = row_count; total_updates := total_updates + n;

  -- Sunday.
  update public.schedule_items set title = 'Grab-and-go breakfast', starts_label = '7:30 am', ends_label = '9:00 am'
   where id = '1011d13c-09af-46b0-a9ad-2ea4a6252631' and engagement_id = eng
     and title = 'Grab and go breakfast and coffee' and starts_label = '7:00 am';
  get diagnostics n = row_count; total_updates := total_updates + n;

  update public.schedule_items set title = 'Pack, checkout and departures'
   where id = '8165e90e-8d87-48f7-8d6f-261862e77028' and engagement_id = eng
     and title = 'Pack, checkout, departures, final cleanup';
  get diagnostics n = row_count; total_updates := total_updates + n;

  raise notice 'updated % existing moment(s) of 18 expected', total_updates;

  /* ===================================================== new moments */

  insert into public.schedule_items
    (id, engagement_id, day_key, starts_label, ends_label, title, track, status, audience, display_mode, position)
  select v.id::uuid, eng, v.day, v.starts, v.ends, v.title, v.track, 'confirmed', v.audience, 'normal', 99
    from (values
      ('b0c56b80-a8c5-4da0-a124-ba5bd275eb6d', 'wed', '4:00 pm', '5:30 pm', 'Full setup team arrives', 'Logistics', 'planner'),
      ('aaf51f00-fd53-4d15-8bf1-9aab0fcb858b', 'wed', '5:30 pm', '8:00 pm', 'Team dinner', 'Meals', 'planner'),
      ('920b31de-4366-420a-a0f5-959e7d80459a', 'thu', '4:00 pm', '5:00 pm', 'Guest arrival and room tours', 'Hospitality', 'everyone'),
      ('a0340a48-b882-46dc-935c-87feda90ebb6', 'thu', '5:00 pm', null, 'Ice breaker: Bible character name game', 'Experience', 'everyone'),
      ('db5dcd8d-d853-45ac-aadf-279c0e50198a', 'thu', '6:30 pm', '7:00 pm', 'Clean up and get ready for worship', 'Logistics', 'everyone'),
      ('b541af80-0cb2-478a-b6a3-135c1b140058', 'fri', '4:00 pm', '5:00 pm', 'Open coffee bar', 'Hospitality', 'everyone'),
      ('fed52e02-9606-4d78-93ec-5e6254b905f6', 'fri', '5:00 pm', '5:30 pm', 'Get ready for dinner', 'Logistics', 'everyone'),
      ('d50d6582-c06a-4554-a9e8-2a49a7107a70', 'fri', '6:30 pm', '7:00 pm', 'Clean up and get ready for worship', 'Logistics', 'everyone'),
      ('74fb6d2a-46ae-4dcf-8061-c923dd6b5e32', 'sat', '4:00 pm', '5:00 pm', 'Open coffee bar', 'Hospitality', 'everyone'),
      ('a2b853ea-44d7-4dbe-a99b-ca1ae8e38e92', 'sat', '5:00 pm', '5:30 pm', 'Get ready for dinner', 'Logistics', 'everyone'),
      ('106db345-660d-4c20-addc-0596569499d0', 'sat', '6:30 pm', '7:00 pm', 'Clean up and get ready for the celebration', 'Logistics', 'everyone'),
      ('67cc1d3b-107c-480f-aeb7-fc45dd812e3c', 'sun', '9:00 am', '11:30 am', 'Final cleanup and house reset', 'Logistics', 'planner')
    ) as v(id, day, starts, ends, title, track, audience)
   where not exists (select 1 from public.schedule_items x where x.id = v.id::uuid);
  get diagnostics n = row_count; total_new := n;
  raise notice 'added % new moment(s) of 12', total_new;

  /* ========================================= what a guest may read */

  create temporary table guest_copy (id uuid primary key, guide jsonb) on commit drop;
  insert into guest_copy values
    ('920b31de-4366-420a-a0f5-959e7d80459a', $j${"kind":"arrival","summary":"Welcome, help with luggage and a tour of the house."}$j$),
    ('a0340a48-b882-46dc-935c-87feda90ebb6', $j${"kind":"game","summary":"Laugh, connect and learn names."}$j$),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102', $j${"kind":"meal","summary":"A warm, informal opening meal.","menu":["Smoked burnt ends","Warm popovers with strawberry compote butter","House-made cheesy jalapeño dip and tortilla chips","Brownies","Pork hot link slices","Chicken skewers"]}$j$),
    ('db5dcd8d-d853-45ac-aadf-279c0e50198a', $j${"kind":"break","title":"Get ready for worship"}$j$),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9103', $j${"kind":"worship"}$j$),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9104', $j${"kind":"program","summary":"Sammy and Suzanne welcome everyone and frame the weekend."}$j$),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9105', $j${"kind":"social","summary":"Unhurried time together."}$j$),

    ('98992a00-9a21-48ec-8b68-9a14aac8e3ff', $j${"kind":"meal","menu":["Egg and sausage bake","Fresh English muffin toast","Homemade apple butter","Cut-up mixed fresh fruit","Freshly brewed coffee from The Dock Coffee","Orange juice"]}$j$),
    ('86b0ec99-8fce-444a-990e-b44837ef88d5', $j${"kind":"worship"}$j$),
    ('c6c6dabc-a9cf-42ef-b5f1-01c194251f6c', $j${"kind":"program"}$j$),
    ('ecad74c7-cf11-42b1-b171-05aad9563850', $j${"kind":"program","summary":"The story of God's work and impact."}$j$),
    ('955e25bf-6e62-4af1-b6ff-c63485d89af1', $j${"kind":"coffee","summary":"The coffee bar is open.","opens":["coffee"]}$j$),
    ('937d12aa-aef3-499e-827a-36c180787006', $j${"kind":"program","summary":"Includes the Lengthen the Cords illustration."}$j$),
    ('2c7f67e3-6f5d-4da4-98b9-c72586f89459', $j${"kind":"program"}$j$),
    ('8c658bb2-d05c-4db9-b514-babc9bfdc251', $j${"kind":"meal","menu":["Build-your-own fresh-baked croissant sandwiches: ham, turkey, provolone and cheddar, lettuce, sliced tomatoes, mayonnaise and butter","House-made hearty chicken wild rice soup with soda crackers","Bistro kettle chips","Assorted cookies"]}$j$),
    ('98dc6592-07ac-4a22-bc56-e3c414be1a9b', $j${"kind":"free","summary":"Rest and time together. See everything the property offers.","opens":["activities"]}$j$),
    ('995c6b13-6c34-421a-8c36-d138aeb9459c', $j${"kind":"game","optional":true,"summary":"A personalized game to celebrate and connect. Optional: free time and activities stay open."}$j$),
    ('b541af80-0cb2-478a-b6a3-135c1b140058', $j${"kind":"coffee","summary":"Free time continues and the coffee bar is open.","opens":["coffee","activities"]}$j$),
    ('fed52e02-9606-4d78-93ec-5e6254b905f6', $j${"kind":"break"}$j$),
    ('761ace4d-76eb-41c1-a90c-7687d0783737', $j${"kind":"meal","menu":["Signature smoked brisket, carved by our staff","Baked potato with butter and sour cream, or garlic baby reds instead","Hot honey Brussels sprouts with bacon","House-made coleslaw","Warm dinner rolls with soft butter","Apple crisp with house-made whipped cream"]}$j$),
    ('d50d6582-c06a-4554-a9e8-2a49a7107a70', $j${"kind":"break","title":"Get ready for worship"}$j$),
    ('463fec53-6bef-42d4-b25e-31bcbb96256d', $j${"kind":"worship"}$j$),
    ('752801c2-1d94-4ecd-9358-b479f14e3ff5', $j${"kind":"program","summary":"Stories and videos of changed lives."}$j$),
    ('d951b5ec-e0fa-4279-86e7-be1ddc99ef54', $j${"kind":"social","summary":"Bonfire, arcade and movies with candy."}$j$),

    ('514d14f4-14ec-423f-acba-e6da7d1df9c3', $j${"kind":"meal","menu":["Sausage gravy and biscuits","House-made cheese and sun-dried tomato quiche","Cut-up mixed fresh fruit","Coffee and orange juice"]}$j$),
    ('644f01ec-3774-45e8-b91f-e2035184e972', $j${"kind":"worship"}$j$),
    ('e480befc-8182-460f-84bf-4f0459d16d9b', $j${"kind":"program"}$j$),
    ('1be2ec84-8cef-4184-8090-8016bab25052', $j${"kind":"program","summary":"Stories of transformation."}$j$),
    ('1d8a351a-a33e-481c-9f51-3027e5b06364', $j${"kind":"coffee","summary":"The coffee bar is open.","opens":["coffee"]}$j$),
    ('c8d8cc63-b1a4-4ae9-819a-5786a9370f43', $j${"kind":"program","summary":"The central vision for SHINE's future."}$j$),
    ('96af7544-c551-4cd0-b794-8b9aeefa5ef5', $j${"kind":"program"}$j$),
    ('1ea0f672-0f79-430d-b08b-5fcb14d2ecac', $j${"kind":"program","summary":"Includes the Strengthen the Stakes illustration."}$j$),
    ('ebb5c598-57ce-4c1e-be22-fd23ddfb5b86', $j${"kind":"meal","menu":["Ultimate salad bar with fresh chopped romaine and a choice of 8 salad toppings","House-made ranch, French and vinaigrette","Italian beef slider sandwiches with warm au jus","Assorted bars"]}$j$),
    ('56aa5c99-767d-4281-988c-8be40de8e17e', $j${"kind":"free","summary":"Rest and time together, including the lakefront prayer walk.","opens":["activities"]}$j$),
    ('851edeef-b4db-4c29-9001-a6bc677151f9', $j${"kind":"game","optional":true,"summary":"A playful team tournament. Optional: free time and activities stay open."}$j$),
    ('74fb6d2a-46ae-4dcf-8061-c923dd6b5e32', $j${"kind":"coffee","summary":"Free time continues and the coffee bar is open.","opens":["coffee","activities"]}$j$),
    ('a2b853ea-44d7-4dbe-a99b-ca1ae8e38e92', $j${"kind":"break"}$j$),
    ('1b2e2eaa-61e6-464d-9cd3-5193e65af702', $j${"kind":"meal","menu":["Smoked half chicken ribs","Yukon gold mashed potatoes and gravy","Chef's choice seasonal green vegetable","Southwest black bean and corn salad","Warm dinner rolls with soft butter","Pumpkin cheesecake"]}$j$),
    ('106db345-660d-4c20-addc-0596569499d0', $j${"kind":"break","title":"Get ready for the celebration"}$j$),
    ('eb513b79-1a91-4c48-9663-c890ce38c3a0', $j${"kind":"social","summary":"Bonfires, games, desserts and an ice cream social.","tbc":"An optional glow walk or run is still to be confirmed."}$j$),

    ('1011d13c-09af-46b0-a9ad-2ea4a6252631', $j${"kind":"meal","summary":"Grab-and-go while you pack.","menu":["Spinach and feta breakfast pastry","Assorted scratch-made scones and muffins","Whole fresh fruit or individual mixed fruit cups","Individual premade yogurt parfaits","Orange juice and coffee","To-go containers and cups"]}$j$),
    ('8165e90e-8d87-48f7-8d6f-261862e77028', $j${"kind":"break","summary":"No program on Sunday. Load up, check out and head home."}$j$),

    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201', $j${"kind":"arrival"}$j$),
    ('b0c56b80-a8c5-4da0-a124-ba5bd275eb6d', $j${"kind":"arrival"}$j$),
    ('aaf51f00-fd53-4d15-8bf1-9aab0fcb858b', $j${"kind":"meal","summary":"Dinner together as a team: grilled burgers and chips, then a bonfire and apple cider."}$j$),
    ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9101', $j${"kind":"break"}$j$),
    ('67cc1d3b-107c-480f-aeb7-fc45dd812e3c', $j${"kind":"break"}$j$);

  update public.schedule_items s set guest_guide = g.guide
    from guest_copy g
   where s.id = g.id and s.engagement_id = eng and s.guest_guide is null;
  get diagnostics n = row_count;
  raise notice 'guest copy on % moment(s)', n;

  /* Guest facing locations, only where the workbook gives a place a guest
     would recognise. Bingo and cornhole are general and provisional. */
  update public.schedule_items s set location = v.location
    from (values
      ('920b31de-4366-420a-a0f5-959e7d80459a', 'Entry and lodging'),
      ('a0340a48-b882-46dc-935c-87feda90ebb6', 'Main gathering area'),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102', 'Dining and gathering area'),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9103', 'Main room'),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9104', 'Main room'),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9105', 'House and bonfire area'),
      ('98992a00-9a21-48ec-8b68-9a14aac8e3ff', 'Dining area'),
      ('86b0ec99-8fce-444a-990e-b44837ef88d5', 'Main room'),
      ('c6c6dabc-a9cf-42ef-b5f1-01c194251f6c', 'Main room'),
      ('ecad74c7-cf11-42b1-b171-05aad9563850', 'Main room'),
      ('955e25bf-6e62-4af1-b6ff-c63485d89af1', 'Coffee station'),
      ('937d12aa-aef3-499e-827a-36c180787006', 'Main room'),
      ('2c7f67e3-6f5d-4da4-98b9-c72586f89459', 'Main room'),
      ('8c658bb2-d05c-4db9-b514-babc9bfdc251', 'Dining area'),
      ('98dc6592-07ac-4a22-bc56-e3c414be1a9b', 'Around the property'),
      ('995c6b13-6c34-421a-8c36-d138aeb9459c', 'Main gathering area'),
      ('b541af80-0cb2-478a-b6a3-135c1b140058', 'Coffee station'),
      ('761ace4d-76eb-41c1-a90c-7687d0783737', 'Dining area'),
      ('463fec53-6bef-42d4-b25e-31bcbb96256d', 'Main room'),
      ('752801c2-1d94-4ecd-9358-b479f14e3ff5', 'Main room'),
      ('d951b5ec-e0fa-4279-86e7-be1ddc99ef54', 'House and outdoors'),
      ('514d14f4-14ec-423f-acba-e6da7d1df9c3', 'Dining area'),
      ('644f01ec-3774-45e8-b91f-e2035184e972', 'Main room'),
      ('e480befc-8182-460f-84bf-4f0459d16d9b', 'Main room'),
      ('1be2ec84-8cef-4184-8090-8016bab25052', 'Main room'),
      ('1d8a351a-a33e-481c-9f51-3027e5b06364', 'Coffee station'),
      ('c8d8cc63-b1a4-4ae9-819a-5786a9370f43', 'Main room'),
      ('96af7544-c551-4cd0-b794-8b9aeefa5ef5', 'Main room'),
      ('1ea0f672-0f79-430d-b08b-5fcb14d2ecac', 'Main room'),
      ('ebb5c598-57ce-4c1e-be22-fd23ddfb5b86', 'Dining area'),
      ('56aa5c99-767d-4281-988c-8be40de8e17e', 'Around the property'),
      ('851edeef-b4db-4c29-9001-a6bc677151f9', 'Outdoor area'),
      ('74fb6d2a-46ae-4dcf-8061-c923dd6b5e32', 'Coffee station'),
      ('1b2e2eaa-61e6-464d-9cd3-5193e65af702', 'Dining area'),
      ('eb513b79-1a91-4c48-9663-c890ce38c3a0', 'Around the property'),
      ('1011d13c-09af-46b0-a9ad-2ea4a6252631', 'Dining area'),
      ('8165e90e-8d87-48f7-8d6f-261862e77028', 'House and parking')
    ) as v(id, location)
   where s.id = v.id::uuid and s.engagement_id = eng and s.location is null;
  get diagnostics n = row_count;
  raise notice 'guest locations on % moment(s)', n;

  /* ====================================== how the team runs each one */

  insert into public.schedule_item_ops (schedule_item_id, engagement_id, detail)
  select v.id::uuid, eng, v.detail::jsonb
    from (values
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201', $j${"purpose":"Arrive, pray over the property, settle in and prepare","owner":"Brooke","emcee":"Ryan","location":"Property","support":"Alice, Mike, Scott, Keta, Emma, Wanyoni family","materials":"Arrival list, keys, prayer guide","next":"Confirm arrivals and rooms","notes":"Keta's birthday celebration is on this day; see Volunteer duties to confirm timing."}$j$),
      ('b0c56b80-a8c5-4da0-a124-ba5bd275eb6d', $j${"purpose":"Unload, tour work areas and assign setup zones","owner":"Brooke","emcee":"Ryan","location":"House / property","support":"Full setup team","materials":"Setup checklist, carts, labels","next":"Quick alignment huddle"}$j$),
      ('aaf51f00-fd53-4d15-8bf1-9aab0fcb858b', $j${"purpose":"Feed the setup team and eat together","owner":"Brooke; meal by Keta and Emma","emcee":"Ryan","location":"Dining / outdoor","support":"Keta and Emma","materials":"Dinner, cake, cider","next":"Review Thursday priorities"}$j$),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9101', $j${"purpose":"Finish guest rooms, hospitality, illustrations, AV and team prayer","owner":"Brooke","emcee":"Ryan","location":"Entire property","support":"See Volunteer duties","materials":"Room gifts, signs, displays, rope, stakes","next":"Final room and production walk","notes":"Include the illustration rehearsal with Mike."}$j$),
      ('920b31de-4366-420a-a0f5-959e7d80459a', $j${"purpose":"Welcome guests, unload luggage and orient them to the house","owner":"Brooke","emcee":"Ryan","location":"Entry / lodging","support":"Ryan, Brooke and Junior","materials":"Check-in table, room list, welcome gifts","next":"Invite guests toward the icebreaker","notes":"Arrival may continue through dinner."}$j$),
      ('a0340a48-b882-46dc-935c-87feda90ebb6', $j${"purpose":"Help guests laugh, connect and learn names","owner":"Ryan","emcee":"Ryan","location":"Main gathering area","support":"Emma prepares; team participates","materials":"Printed Bible character name tags","next":"Move guests toward appetizers"}$j$),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102', $j${"purpose":"Warm, informal opening meal","owner":"Brooke","emcee":"Ryan","location":"Dining / gathering","support":"Cleanup team on standby","materials":"Catered appetizers, plates, drinks","next":"Five-minute cleanup notice"}$j$),
      ('db5dcd8d-d853-45ac-aadf-279c0e50198a', $j${"purpose":"Clear food, reset seating, check microphones","owner":"Keta","emcee":"Ryan","location":"Dining / main room","support":"Alice, Keta, Emma and Scott","materials":"Cleanup supplies, AV checklist","next":"Mike and tent props ready"}$j$),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9103', $j${"purpose":"Open the weekend and turn attention toward God","owner":"Mike opens; JonCarlos leads worship","emcee":"Ryan","location":"Main room / lawn","support":"Mike, Ryan and Brooke for the tent; Scott audio; Junior AV","materials":"Two small tents, timer, Expand the Tent sign; microphones, lyrics, instruments","next":"Ryan introduces Sammy and Suzanne","notes":"Build the Tent challenge, first sermon illustration. The schedule has Mike opening at 7:00 before worship; the workbook has the challenge at 6:50 to 7:00. Leave one or both tents displayed."}$j$),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9104', $j${"purpose":"Sammy and Suzanne welcome the group and frame the weekend","owner":"Sammy and Suzanne","emcee":"Ryan","location":"Main room","support":"Junior photo and video","materials":"Teaching notes, theme Scripture","next":"Close into prayer or fellowship","notes":"Tent remains visible as the theme prop."}$j$),
      ('b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9105', $j${"purpose":"Unhurried relationship time","owner":"Brooke","emcee":"Ryan","location":"House / bonfire area","support":"Snack station team; Scott if bonfire","materials":"Snacks, drinks, candles","next":"Announce Friday breakfast"}$j$),

      ('98992a00-9a21-48ec-8b68-9a14aac8e3ff', $j${"purpose":"Hospitality and connection","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team; coffee support","materials":"Egg and sausage bake, toast, fruit, coffee","next":"Five-minute call to worship"}$j$),
      ('86b0ec99-8fce-444a-990e-b44837ef88d5', $j${"purpose":"Begin the day centered on God","owner":"JonCarlos","emcee":"Ryan","location":"Main room","support":"Scott audio; Junior AV","materials":"Worship setup","next":"Hand off to Tito"}$j$),
      ('c6c6dabc-a9cf-42ef-b5f1-01c194251f6c', $j${"purpose":"Short devotional","owner":"Tito","emcee":"Ryan","location":"Main room","support":"Junior coverage","materials":"Bible / notes","next":"Hand off to Mike and Victor"}$j$),
      ('ecad74c7-cf11-42b1-b171-05aad9563850', $j${"purpose":"Tell the story of God's work and impact","owner":"Mike and Victor","emcee":"Ryan","location":"Main room","support":"Junior AV and coverage","materials":"Slides, photos, video","next":"Announce break"}$j$),
      ('955e25bf-6e62-4af1-b6ff-c63485d89af1', $j${"purpose":"Refresh and reset the room","owner":"Brooke","emcee":"Ryan","location":"House","support":"Snack station team","materials":"Coffee, water, restroom check","next":"Rope pieces placed or handed out"}$j$),
      ('937d12aa-aef3-499e-827a-36c180787006', $j${"purpose":"Share next steps and demonstrate reach through connected relationships","owner":"Mike","emcee":"Ryan","location":"Main room","support":"Mike, Ryan and Brooke","materials":"Precut rope, knot sample, Scripture slide","next":"Collect or display the connected cord","notes":"Second sermon illustration: Lengthen the Cords."}$j$),
      ('2c7f67e3-6f5d-4da4-98b9-c72586f89459', $j${"purpose":"Respond spiritually to what SHINE is becoming","owner":"Sammy and Suzanne","emcee":"Ryan","location":"Main room","support":"Junior coverage","materials":"Teaching notes","next":"Release to lunch"}$j$),
      ('8c658bb2-d05c-4db9-b514-babc9bfdc251', $j${"purpose":"Hospitality and table conversation","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team","materials":"Croissant sandwich bar, soup, cookies","next":"Explain free-time options"}$j$),
      ('98dc6592-07ac-4a22-bc56-e3c414be1a9b', $j${"purpose":"Rest and relationships","owner":"Brooke and Ryan","emcee":"Ryan","location":"Property","support":"As needed","materials":"Activity menu","next":"Call guests for bingo"}$j$),
      ('995c6b13-6c34-421a-8c36-d138aeb9459c', $j${"purpose":"Celebrate and connect through a personalized game","owner":"Ryan and Brooke","emcee":"Ryan","location":"Main gathering (provisional)","support":"Game prep team","materials":"Bingo cards and ranked prizes","next":"Reopen free time and coffee"}$j$),
      ('b541af80-0cb2-478a-b6a3-135c1b140058', $j${"purpose":"Rest, conversation and hospitality","owner":"Brooke","emcee":"Ryan","location":"House / coffee station","support":"Snack and coffee team","materials":"Espresso supplies and snacks","next":"Get-ready reminder"}$j$),
      ('fed52e02-9606-4d78-93ec-5e6254b905f6', $j${"purpose":"Personal reset and dining setup","owner":"Brooke","emcee":"Ryan","location":"House","support":"Hospitality team","materials":"Table settings","next":"Call to dinner"}$j$),
      ('761ace4d-76eb-41c1-a90c-7687d0783737', $j${"purpose":"Shared meal","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team","materials":"Brisket dinner and dessert","next":"Announce cleanup and worship"}$j$),
      ('d50d6582-c06a-4554-a9e8-2a49a7107a70', $j${"purpose":"Clear dinner and prepare the main room","owner":"Keta","emcee":"Ryan","location":"Dining / main room","support":"Alice, Keta, Emma and Scott","materials":"Cleanup and AV supplies","next":"Worship team in position"}$j$),
      ('463fec53-6bef-42d4-b25e-31bcbb96256d', $j${"purpose":"Evening worship","owner":"JonCarlos","emcee":"Ryan","location":"Main room","support":"Scott audio; Junior AV","materials":"Worship setup","next":"Hand off to Rev. Canana"}$j$),
      ('752801c2-1d94-4ecd-9358-b479f14e3ff5', $j${"purpose":"Connect guests to changed lives","owner":"Rev. Canana","emcee":"Ryan","location":"Main room","support":"Junior AV and coverage","materials":"Video files and microphones","next":"Move into fellowship","notes":"Time to confirm: the schedule shows 6:50 PM, listed after 7:00 PM worship; the workbook has 7:50 to 8:30 PM."}$j$),
      ('d951b5ec-e0fa-4279-86e7-be1ddc99ef54', $j${"purpose":"Relaxed close with arcade, candy and conversation","owner":"Scott and Brooke","emcee":"Ryan","location":"House / outdoors","support":"Scott bonfire; snack team","materials":"Fire supplies, movies, candy","next":"Announce Saturday breakfast"}$j$),

      ('514d14f4-14ec-423f-acba-e6da7d1df9c3', $j${"purpose":"Hospitality and connection","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team; coffee support","materials":"Biscuits and gravy, quiche, fruit, coffee","next":"Five-minute call to worship"}$j$),
      ('644f01ec-3774-45e8-b91f-e2035184e972', $j${"purpose":"Begin the day centered on God","owner":"JonCarlos","emcee":"Ryan","location":"Main room","support":"Scott audio; Junior AV","materials":"Worship setup","next":"Hand off to the devotional leader"}$j$),
      ('e480befc-8182-460f-84bf-4f0459d16d9b', $j${"purpose":"Short devotional","owner":"To confirm","emcee":"Ryan","location":"Main room","support":"Junior coverage","materials":"Bible / notes","next":"Hand off to impact stories","status":"Needs owner","notes":"The schedule names Tito; the workbook says to assign a SHINE leader."}$j$),
      ('1be2ec84-8cef-4184-8090-8016bab25052', $j${"purpose":"Share concise stories of transformation","owner":"Assigned storytellers","emcee":"Ryan","location":"Main room","support":"Junior AV and coverage","materials":"Microphones, selected video","next":"Use the hula hoop only if energy is low","notes":"The hula-hoop energizer is optional, not a required segment."}$j$),
      ('1d8a351a-a33e-481c-9f51-3027e5b06364', $j${"purpose":"Refresh and reset","owner":"Brooke","emcee":"Ryan","location":"House","support":"Snack station team","materials":"Coffee, water, restroom check","next":"Prepare Sammy's presentation"}$j$),
      ('c8d8cc63-b1a4-4ae9-819a-5786a9370f43', $j${"purpose":"Cast the central vision for SHINE's future","owner":"Sammy","emcee":"Ryan","location":"Main room","support":"Junior AV and coverage","materials":"Presentation, Scripture, tent and cord visuals","next":"Move into the partner invitation"}$j$),
      ('96af7544-c551-4cd0-b794-8b9aeefa5ef5', $j${"purpose":"Explain response pathways","owner":"To confirm","emcee":"Ryan","location":"Main room / tent display","support":"Mike, Ryan, Brooke; prayer team","materials":"Quiet music","next":"Giving logistics","status":"Needs owner","notes":"The schedule lists the partner ask as TBD. The workbook treats it and the stakes as one 11:30 to 12:00 segment led by Mike and SHINE leadership."}$j$),
      ('1ea0f672-0f79-430d-b08b-5fcb14d2ecac', $j${"purpose":"Give each guest a personal take-home stake","owner":"Mike","emcee":"Ryan","location":"Main room / tent display","support":"Mike, Ryan, Brooke; prayer team","materials":"Four-sided stakes, Sharpies, giving logistics","next":"Guests keep their stakes","notes":"Final sermon illustration: Strengthen the Stakes."}$j$),
      ('ebb5c598-57ce-4c1e-be22-fd23ddfb5b86', $j${"purpose":"Hospitality and conversation","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team","materials":"Ultimate salad bar and sandwiches","next":"Explain the prayer walk and free time"}$j$),
      ('56aa5c99-767d-4281-988c-8be40de8e17e', $j${"purpose":"Rest, reflection and relationships","owner":"Brooke and Ryan","emcee":"Ryan","location":"Property","support":"As needed","materials":"Prayer prompts, maps","next":"Call guests for cornhole"}$j$),
      ('851edeef-b4db-4c29-9001-a6bc677151f9', $j${"purpose":"Playful team connection","owner":"Ryan and Brooke","emcee":"Ryan","location":"Outdoor area (provisional)","support":"Game prep team","materials":"Cornhole sets and bracket","next":"Reopen free time and coffee","notes":"Weather backup needed."}$j$),
      ('74fb6d2a-46ae-4dcf-8061-c923dd6b5e32', $j${"purpose":"Rest and conversation","owner":"Brooke","emcee":"Ryan","location":"House / coffee station","support":"Snack and coffee team","materials":"Espresso supplies and snacks","next":"Get-ready reminder"}$j$),
      ('a2b853ea-44d7-4dbe-a99b-ca1ae8e38e92', $j${"purpose":"Personal reset and celebration setup","owner":"Brooke","emcee":"Ryan","location":"House","support":"Hospitality team","materials":"Celebration supplies","next":"Call to dinner"}$j$),
      ('1b2e2eaa-61e6-464d-9cd3-5193e65af702', $j${"purpose":"Celebrate God's faithfulness together","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Meal cleanup team","materials":"Chicken dinner and pumpkin cheesecake","next":"Announce the celebration flow"}$j$),
      ('106db345-660d-4c20-addc-0596569499d0', $j${"purpose":"Clear dinner and activate evening stations","owner":"Keta and Scott","emcee":"Ryan","location":"Dining / outdoors","support":"Cleanup team; Scott bonfires","materials":"Cleanup, fire, dessert and glow supplies","next":"Open the celebration"}$j$),
      ('eb513b79-1a91-4c48-9663-c890ce38c3a0', $j${"purpose":"Bonfires, games, desserts, music and an optional glow walk or run","owner":"Brooke and Ryan","emcee":"Ryan","location":"Property","support":"Scott, Ryan, Brooke; Junior coverage","materials":"Ice cream social, glow materials, games, fire supplies","next":"Close informally and announce the departure plan","status":"Glow walk or run still to be decided"}$j$),

      ('1011d13c-09af-46b0-a9ad-2ea4a6252631', $j${"purpose":"Simple hospitality during packing","owner":"Brooke","emcee":"Ryan","location":"Dining area","support":"Breakfast cleanup team","materials":"Pastries, muffins, fruit, coffee, to-go cups","next":"Departure reminders"}$j$),
      ('8165e90e-8d87-48f7-8d6f-261862e77028', $j${"purpose":"Load vehicles, check rooms and say goodbye","owner":"Brooke and Ryan","emcee":"Ryan","location":"House / parking","support":"All available team","materials":"Checkout list, lost and found","next":"Begin the final reset","notes":"No Sunday program."}$j$),
      ('67cc1d3b-107c-480f-aeb7-fc45dd812e3c', $j${"purpose":"Restore the property and pack all event materials","owner":"Brooke","emcee":"Ryan","location":"Entire property","support":"To assign; all remaining team","materials":"Reset checklist and packing labels","next":"Final property walkthrough","status":"Needs owner","notes":"Assign cleanup zones before the weekend."}$j$)
    ) as v(id, detail)
   where exists (select 1 from public.schedule_items x where x.id = v.id::uuid and x.engagement_id = eng)
  on conflict (schedule_item_id) do nothing;
  get diagnostics n = row_count;
  raise notice 'run of show detail on % moment(s)', n;

  /* ================================================ volunteer duties */

  if not exists (select 1 from public.tasks where engagement_id = eng and duty is not null) then
    insert into public.tasks (engagement_id, title, owner_name, due_on, status, schedule_item_id, duty)
    select eng, v.title, v.owner, v.due::date, v.status, v.moment::uuid,
           jsonb_strip_nulls(jsonb_build_object('phase', v.phase, 'when', v.at, 'notes', v.notes, 'order', v.ord))
      from (values
        (1,  'before', 'Purchase espresso machines', 'Mike', '2026-09-23', 'todo', 'By September 23', 'Ship to Ryan and Brooke.', null),
        (2,  'before', 'Purchase espresso drink ingredients', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', 'Ship to Ryan and Brooke; allow time to practice.', null),
        (3,  'before', 'Create weekend background music playlist', 'Mike', '2026-09-23', 'todo', 'By September 23', null, null),
        (4,  'before', 'Make and print Bible character game name tags', 'Emma', '2026-09-23', 'todo', 'By September 23', null, 'a0340a48-b882-46dc-935c-87feda90ebb6'),
        (5,  'before', 'Prepare games', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', null, null),
        (6,  'before', 'Shop for Costco supplies', 'Keta & Emma', '2026-09-23', 'todo', 'By September 23', 'Use the supplied shopping list.', null),
        (7,  'before', 'Purchase Amazon wish list', 'Mike & Keta', '2026-09-23', 'todo', 'By September 23', 'Ship to Ryan and Brooke.', null),
        (8,  'before', 'Pick up honey in Prior Lake', 'Keta', '2026-09-23', 'todo', 'By September 23', 'Bring to Ryan and Brooke.', null),
        (9,  'before', 'Purchase flowers', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', 'Confirm pickup timing for freshness.', null),
        (10, 'before', 'Create beverage and snack list', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', null, null),
        (11, 'before', 'Prepare table displays', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', null, null),
        (12, 'before', 'Plan Keta''s birthday celebration', 'Emma', '2026-09-23', 'todo', 'By September 23', 'Confirm whether to include and when.', null),
        (13, 'before', 'Make homemade bread', 'Ryan & Brooke', '2026-09-23', 'todo', 'By September 23', 'Confirm baking timing for freshness.', null),
        (14, 'before', 'Select movies and plan photo and video', 'Junior', '2026-09-23', 'todo', 'By September 23', 'Coverage continues during the event.', null),

        (15, 'wed', 'Food for Wednesday', 'Keta & Emma', null, 'todo', 'Meal times TBD', 'Prepare and serve food for the setup team.', 'aaf51f00-fd53-4d15-8bf1-9aab0fcb858b'),
        (16, 'wed', 'Keta''s birthday celebration', 'Emma', null, 'blocked', 'Confirm timing', 'Proposed for Wednesday; confirm the celebration.', null),

        (17, 'thu', 'Assemble balloon arch', 'Ryan & Brooke', null, 'todo', 'Before arrivals', null, null),
        (18, 'thu', 'Assemble flower vases', 'Ryan & Brooke & Keta', null, 'todo', 'Before arrivals', null, null),
        (19, 'thu', 'Assemble bathroom essentials baskets', 'Ryan & Brooke & Emma', null, 'todo', 'Before arrivals', null, null),
        (20, 'thu', 'Assemble room presents', 'Ryan & Brooke & Keta', null, 'todo', 'Before arrivals', null, null),
        (21, 'thu', 'Put up room signs', 'Keta & Emma', null, 'todo', 'Before arrivals', null, null),
        (22, 'thu', 'Set up check-in table', 'Keta & Emma', null, 'todo', 'Before arrivals', null, '920b31de-4366-420a-a0f5-959e7d80459a'),
        (23, 'thu', 'Set out table displays', 'Ryan & Brooke', null, 'todo', 'Before arrivals', 'Prepared before the event.', null),
        (24, 'thu', 'Bellhop and room tours', 'Ryan & Brooke & Junior', null, 'todo', 'Guest arrivals', null, '920b31de-4366-420a-a0f5-959e7d80459a'),
        (25, 'thu', 'Cut rope for illustration', 'Emma & Keta', null, 'todo', 'Before session', null, null),
        (26, 'thu', 'Prepare illustration stakes', 'Keta & Emma', null, 'todo', 'Before session', 'Verse, sticker and other finishing details.', null),
        (27, 'thu', 'Set up outdoor candles and jars', 'Emma & Keta', null, 'todo', 'Before evening', null, null),
        (28, 'thu', 'Set up speakers', 'Scott', null, 'todo', 'Before opening', null, null),
        (29, 'thu', 'Set up audio and visual', 'Junior', null, 'todo', 'Before opening', null, null),
        (30, 'thu', 'Set up and reset snack station', 'Emma, Ryan & Brooke', null, 'todo', 'As scheduled', 'Keep stocked; clean up at the end of the day.', null),
        (31, 'thu', 'Clean up after meals', 'Alice, Keta, Emma & Scott', null, 'todo', 'After catered food', 'Keta coordinates; divide work among the team.', 'db5dcd8d-d853-45ac-aadf-279c0e50198a'),
        (32, 'thu', 'Photo and video coverage', 'Junior', null, 'todo', 'Key moments', 'Confirm coverage times.', null),

        (33, 'fri', 'Clean bathrooms', 'Alice', null, 'todo', 'Morning', 'All event bathrooms; confirm locations and scope.', null),
        (34, 'fri', 'Clean up after breakfast', 'Alice, Keta, Emma & Scott', null, 'todo', 'After breakfast', 'Keta coordinates; divide work among the team.', '98992a00-9a21-48ec-8b68-9a14aac8e3ff'),
        (35, 'fri', 'Set up and reset snack station', 'Emma, Ryan & Brooke', null, 'todo', 'During the day', 'Keep stocked; clean up at the end of the day.', null),
        (36, 'fri', 'Clean up after lunch', 'Alice, Keta, Emma & Scott', null, 'todo', 'After lunch', 'Keta coordinates; divide work among the team.', '8c658bb2-d05c-4db9-b514-babc9bfdc251'),
        (37, 'fri', 'Clean bathrooms', 'Keta', null, 'todo', 'Late afternoon', 'All event bathrooms; confirm locations and scope.', null),
        (38, 'fri', 'Clean up after dinner', 'Alice, Keta, Emma & Scott', null, 'todo', 'After dinner', 'Keta coordinates; divide work among the team.', 'd50d6582-c06a-4554-a9e8-2a49a7107a70'),
        (39, 'fri', 'Photo and video coverage', 'Junior', null, 'todo', 'Key moments', 'Confirm coverage times.', null),

        (40, 'sat', 'Clean bathrooms', 'Emma', null, 'todo', 'Morning', 'All event bathrooms; confirm locations and scope.', null),
        (41, 'sat', 'Clean up after breakfast', 'Alice, Keta, Emma & Scott', null, 'todo', 'After breakfast', 'Keta coordinates; divide work among the team.', '514d14f4-14ec-423f-acba-e6da7d1df9c3'),
        (42, 'sat', 'Set up and reset snack station', 'Emma, Ryan & Brooke', null, 'todo', 'During the day', 'Keep stocked; clean up at the end of the day.', null),
        (43, 'sat', 'Clean up after lunch', 'Alice, Keta, Emma & Scott', null, 'todo', 'After lunch', 'Keta coordinates; divide work among the team.', 'ebb5c598-57ce-4c1e-be22-fd23ddfb5b86'),
        (44, 'sat', 'Clean bathrooms', 'Scott', null, 'todo', 'Late afternoon', 'All event bathrooms; confirm locations and scope.', null),
        (45, 'sat', 'Clean up after dinner', 'Alice, Keta, Emma & Scott', null, 'todo', 'After dinner', 'Keta coordinates; divide work among the team.', '106db345-660d-4c20-addc-0596569499d0'),
        (46, 'sat', 'Photo and video coverage', 'Junior', null, 'todo', 'Key moments', 'Confirm coverage times.', null),

        (47, 'sun', 'Clean up breakfast area', 'Alice, Keta, Emma & Scott', null, 'todo', 'After breakfast', 'Grab-and-go breakfast.', '1011d13c-09af-46b0-a9ad-2ea4a6252631'),
        (48, 'sun', 'Pack snack station', 'Emma, Ryan & Brooke', null, 'todo', 'Before departure', null, null),
        (49, 'sun', 'Pack speakers', 'Scott', null, 'todo', 'After final use', null, null),
        (50, 'sun', 'Pack audio and visual', 'Junior', null, 'todo', 'After final use', null, null),
        (51, 'sun', 'Photo and video coverage', 'Junior', null, 'todo', 'Closing moments', 'Confirm coverage times.', null),
        (52, 'sun', 'Final cleanup and house reset', 'To assign', null, 'todo', 'Before departure', 'Confirm the team and checkout needs.', '67cc1d3b-107c-480f-aeb7-fc45dd812e3c'),

        (53, 'tbd', 'Build and prepare bonfires', 'Scott', null, 'todo', 'Evening(s) TBD', 'Add a dated duty for each confirmed bonfire.', null),
        (54, 'tbd', 'Glow walk or run setup and teardown', 'Scott, Ryan & Brooke', null, 'blocked', 'Day and time TBD', 'Confirm whether the activity will take place.', null),
        (55, 'tbd', 'Illustration setup and teardown', 'Mike, Ryan & Brooke', null, 'todo', 'Session times TBD', 'Assign each session once the schedule is confirmed.', null)
      ) as v(ord, phase, title, owner, due, status, at, notes, moment);
    get diagnostics n = row_count;
    raise notice 'added % volunteer duties of 55', n;
  else
    raise notice 'volunteer duties already present, none added';
  end if;

  /* ================================================== open decisions */

  insert into public.decisions (engagement_id, question, context, owner_name, status)
  select eng, v.question, v.context, v.owner, 'open'
    from (values
      ('Assign the Saturday devotional leader', 'Needed before the final team briefing. The workbook says an assigned SHINE leader; the schedule names Tito.', 'Ryan'),
      ('Confirm the Saturday impact storytellers', 'Needed before the AV file deadline. Current direction: concise stories plus selected media.', 'Ryan and SHINE leadership'),
      ('Decide whether the glow walk or run is included', 'Needed before supplies and route setup. Current direction: optional during the celebration evening.', 'Ryan and Brooke'),
      ('Assign Sunday final cleanup zones', 'Needed before guest arrival. Current direction: all remaining team with a zone checklist.', 'Brooke'),
      ('Confirm tent display locations', 'Needed by Thursday setup. Current direction: one inside and one outside if space permits.', 'Mike, Ryan and Brooke'),
      ('Confirm the hula-hoop energizer trigger', 'Saturday morning. Current direction: use only if the room needs energy.', 'Mike and Ryan'),
      ('Confirm the final bonfire night or nights', 'Needed before setup day. Current direction: Friday and/or Saturday.', 'Scott and Brooke')
    ) as v(question, context, owner)
   where not exists (
     select 1 from public.decisions d where d.engagement_id = eng and d.question = v.question
   );
  get diagnostics n = row_count;
  raise notice 'added % open decision(s) of 7', n;

  /* ================================================ the guide itself */

  update public.engagements
     set reference = jsonb_set(coalesce(reference, '{}'::jsonb), '{guide}', $j${
       "public": true,
       "coffee": [
         {"name": "The Shine", "art": "shine", "ingredients": ["Espresso", "Vanilla", "Milk", "Vanilla cold foam", "Gold dust"], "feel": "Bright, different, memorable."},
         {"name": "Honeycomb", "art": "honeycomb", "ingredients": ["Espresso", "Honey", "Brown sugar", "Milk", "Salted honey cold foam"], "feel": "Rich but approachable."},
         {"name": "Northwoods", "art": "northwoods", "ingredients": ["Espresso", "Caramel", "Milk", "Whipped cream", "Caramel drizzle"], "feel": "Perfect for the cabin."}
       ],
       "activities": [
         {"name": "Heated pool", "category": "Water"},
         {"name": "Two hot tubs", "category": "Wellness"},
         {"name": "Sauna", "category": "Wellness"},
         {"name": "Kayaks", "category": "Water"},
         {"name": "Paddleboards", "category": "Water"},
         {"name": "Paddle boats and water bikes (4 bikes)", "category": "Water"},
         {"name": "Fishing", "category": "Water"},
         {"name": "Pickleball", "category": "Sports"},
         {"name": "Basketball", "category": "Sports"},
         {"name": "Volleyball", "category": "Sports"},
         {"name": "Cornhole and bags", "category": "Sports", "note": "For casual play. The cornhole tournament is a separate game on the schedule."},
         {"name": "Four-hole disc golf", "category": "Sports"},
         {"name": "Tetherball", "category": "Sports"},
         {"name": "Bonfire and fire pit", "category": "Gathering"},
         {"name": "Outdoor fireplace and fire table", "category": "Gathering"},
         {"name": "Wood-fired pizza oven", "category": "Food"},
         {"name": "Large grill", "category": "Food"},
         {"name": "Home theater", "category": "Indoor"},
         {"name": "Karaoke", "category": "Indoor"},
         {"name": "Pool table", "category": "Indoor"},
         {"name": "Ping pong", "category": "Indoor"},
         {"name": "Foosball", "category": "Indoor"},
         {"name": "Shuffleboard", "category": "Indoor"},
         {"name": "Retro arcade games", "category": "Indoor"},
         {"name": "Board games", "category": "Indoor"},
         {"name": "Quiet seating areas", "category": "Rest"},
         {"name": "Lakefront prayer walk", "category": "Spiritual"},
         {"name": "Green space", "category": "Outdoor"}
       ]
     }$j$::jsonb)
   where id = eng and (reference -> 'guide') is null;
  get diagnostics n = row_count;
  raise notice 'published the guide: % row', n;
end $$;
