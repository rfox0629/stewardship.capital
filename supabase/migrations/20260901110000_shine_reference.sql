-- Vision, venue, and drinks: what the team reads rather than works.
--
-- This is reference, so it lives on the engagement and rides the row level
-- security the engagement already has. No new table, no new policy, no new
-- screen to administer.
--
-- Where the source sheet carries detail this migration does not, the field
-- says so in "needs" rather than being filled with something plausible.

update public.engagements
set reference = $json${
  "vision": {
    "theme": "Expand the Tent",
    "scripture": "Isaiah 54:2 to 3",
    "elements": [
      { "name": "Build the Tent Team Challenge", "scripture": "Isaiah 54:2" },
      { "name": "Lengthen the Cords: Knot Tying", "scripture": "Isaiah 54:2; Ecclesiastes 4:9, 12" },
      { "name": "Human Knot or Hula Hoop Circle", "scripture": "1 Corinthians 12:12, 27" },
      { "name": "Take Home Stake", "scripture": "Isaiah 54:2" },
      { "name": "Rope Holder Commitment", "scripture": "Acts 9:25; Galatians 6:2" },
      { "name": "Glow Run or Walk", "scripture": "Matthew 5:14, 16" },
      { "name": "Partner Invitation and Sending", "scripture": "Romans 10:14 to 15" }
    ],
    "needs": "The connection and practical idea written beside each element on the source sheet are not loaded here. Scripture references are carried as written; the wording of each passage is left to the translation SHINE uses."
  },
  "venue": {
    "name": "Spooner Lake Island Oasis",
    "needs": "The source sheet marks each amenity as built in, rental, or review confirmed. Only the two the budget corroborates are classified here; the rest are marked unconfirmed rather than guessed.",
    "amenities": [
      { "name": "Heated pool", "standing": "unconfirmed" },
      { "name": "Hot tubs", "standing": "unconfirmed" },
      { "name": "Sauna", "standing": "unconfirmed" },
      { "name": "Pontoon", "standing": "rental" },
      { "name": "Jet skis", "standing": "rental" },
      { "name": "Kayaks", "standing": "unconfirmed" },
      { "name": "Paddleboards", "standing": "unconfirmed" },
      { "name": "Paddle boats and water bikes", "standing": "unconfirmed" },
      { "name": "Fishing", "standing": "unconfirmed" },
      { "name": "Pickleball", "standing": "unconfirmed" },
      { "name": "Basketball", "standing": "unconfirmed" },
      { "name": "Volleyball", "standing": "unconfirmed" },
      { "name": "Cornhole", "standing": "unconfirmed" },
      { "name": "Disc golf", "standing": "unconfirmed" },
      { "name": "Tetherball", "standing": "unconfirmed" },
      { "name": "Bonfire and fire pit", "standing": "unconfirmed" },
      { "name": "Outdoor fireplace and fire table", "standing": "unconfirmed" },
      { "name": "Wood fired pizza oven", "standing": "unconfirmed" },
      { "name": "Large grill", "standing": "unconfirmed" },
      { "name": "Home theater", "standing": "unconfirmed" },
      { "name": "Karaoke", "standing": "unconfirmed" },
      { "name": "Pool table", "standing": "unconfirmed" },
      { "name": "Ping pong", "standing": "unconfirmed" },
      { "name": "Foosball", "standing": "unconfirmed" },
      { "name": "Shuffleboard", "standing": "unconfirmed" },
      { "name": "Retro arcade games", "standing": "unconfirmed" },
      { "name": "Board games", "standing": "unconfirmed" },
      { "name": "Quiet seating and reading areas", "standing": "unconfirmed" },
      { "name": "Lakefront prayer walk", "standing": "unconfirmed" },
      { "name": "Green space", "standing": "unconfirmed" }
    ]
  },
  "drinks": {
    "needs": "The ingredient concept and feel written beside each name on the source sheet are not loaded here. Nothing is selected yet.",
    "options": [
      { "name": "Golden Hour" },
      { "name": "The Spark" },
      { "name": "Northwoods" },
      { "name": "Campfire" },
      { "name": "Daybreak" },
      { "name": "Wildflower" },
      { "name": "Honeycomb" },
      { "name": "Sunshine" }
    ]
  }
}$json$::jsonb
where id = (
  select e.id from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026'
);
