-- The three reference sheets, complete.
--
-- Vision, venue, and drinks arrived as a transcription of the source sheets.
-- Every field below is that transcription: the Scripture references and the
-- passages quoted beside them, the weekend connection and practical ideas
-- written for each element, the venue's own category, availability, and
-- confirmation column, and the ingredients and feel for each drink.
--
-- Nothing is interpreted here. The "needs" lines that stood in for these
-- columns while they were missing are gone, because the columns are no
-- longer missing. What the sheets leave open, such as the amenities still
-- to be confirmed, stays open and says what has to be confirmed.

update public.engagements
set reference = $json${
  "vision": {
    "theme": "Expand the Tent",
    "scripture": "Isaiah 54:2–3",
    "passage": "NIV: “Enlarge the place of your tent, stretch your tent curtains wide, do not hold back; lengthen your cords, strengthen your stakes.”",
    "connection": "This is the foundation for the entire weekend. God is calling SHINE to prepare for expansion by making room, extending its reach, and strengthening the people and systems supporting the mission.",
    "practical": "Introduce the tent, cords, and stakes on Thursday. Return to each image throughout the weekend. Conclude by asking: What must we enlarge? What cords must we lengthen? What stakes must we strengthen?",
    "elements": [
      {
        "name": "Build the Tent Team Challenge",
        "scripture": "Isaiah 54:2",
        "passage": "NIV: “Enlarge the place of your tent, stretch your tent curtains wide...”",
        "connection": "Expansion requires vision, preparation, teamwork, communication, and action. No one person can build the tent alone.",
        "practical": "Teams race to construct small tents. Debrief which roles emerged, what slowed the team down, and what was required to create room for others."
      },
      {
        "name": "Lengthen the Cords: Knot-Tying",
        "scripture": "Isaiah 54:2; Ecclesiastes 4:9,12",
        "passage": "NIV: “Lengthen your cords...” / “Two are better than one...” / “A cord of three strands is not quickly broken.”",
        "connection": "The cords represent relationships, partnerships, communication, and the people who extend SHINE’s reach. Longer cords allow the tent to expand, but they must remain securely connected.",
        "practical": "Teach a practical knot. Give each person a section of rope. Join the sections together and discuss which relationships or partnerships SHINE needs to strengthen or rely on."
      },
      {
        "name": "Human Knot or Hula-Hoop Circle",
        "scripture": "1 Corinthians 12:12,27",
        "passage": "NIV: “Just as a body, though one, has many parts... so it is with Christ.” / “Now you are the body of Christ...”",
        "connection": "Every person has a role. The team cannot move effectively when members work independently or believe their role is unnecessary.",
        "practical": "After the activity, ask: Where did communication break down? Who helped the group move forward? What happens to the mission when one person disengages?"
      },
      {
        "name": "Take-Home Stake",
        "scripture": "Isaiah 54:2",
        "passage": "NIV: “Strengthen your stakes.”",
        "connection": "Expansion must continue after the weekend. Taking the stake home gives each person a physical reminder of what they committed to strengthen.",
        "practical": "Use pre-sanded wooden stakes. Participants can write “Isaiah 54:2,” their commitment, and the date. They take the stake home and place it in their yard, garden, office, or prayer space. Include a small card explaining the meaning."
      },
      {
        "name": "Rope Holder Commitment",
        "scripture": "Acts 9:25; Galatians 6:2",
        "passage": "NIV: “Lowered him in a basket...” / “Carry each other’s burdens, and in this way you will fulfill the law of Christ.”",
        "connection": "Rope holders carry weight that the person being sent cannot carry alone. The illustration makes supporting the mission personal and specific.",
        "practical": "Give everyone a short piece of rope or a small rope bracelet. Ask them to name whose rope they are holding and what that support will look like after the weekend."
      },
      {
        "name": "Glow Run or Walk",
        "scripture": "Matthew 5:14,16",
        "passage": "NIV: “You are the light of the world.” / “Let your light shine before others, that they may see your good deeds...”",
        "connection": "The weekend ends by moving outward. SHINE is not expanding merely to become larger, but to carry the light of Jesus farther.",
        "practical": "Give participants headlamps or glow items. Begin with prayer, walk or run together, and finish with a commissioning moment focused on taking Christ’s light beyond the weekend."
      },
      {
        "name": "Partner Invitation and Sending",
        "scripture": "Romans 10:14–15",
        "passage": "NIV: “How can they hear without someone preaching to them? And how can anyone preach unless they are sent?”",
        "connection": "Some are called to go, while others help send and sustain them. Both are essential to expanding the tent and reaching more people.",
        "practical": "Present partnership as an invitation to hold the rope, lengthen the cords, and strengthen the stakes, not merely as a financial transaction."
      }
    ]
  },
  "venue": {
    "name": "Spooner Lake Island Oasis",
    "takeaway": "Don’t over-program the property.",
    "amenities": [
      { "name": "Heated pool", "category": "Water", "availability": "Built in", "confirm": "Confirm October operation and temperature" },
      { "name": "Two hot tubs", "category": "Wellness", "availability": "Built in", "confirm": "Confirm operating instructions and capacity" },
      { "name": "Sauna", "category": "Wellness", "availability": "Built in", "confirm": "Confirm capacity and rules" },
      { "name": "Pontoon rides", "category": "Water", "availability": "Rental", "confirm": "Confirm price, driver, life jackets, and weather policy" },
      { "name": "Jet skis", "category": "Water", "availability": "Rental", "confirm": "Confirm price, operators, safety rules, and weather policy" },
      { "name": "Kayaks", "category": "Water", "availability": "Built in", "confirm": "Confirm life jackets" },
      { "name": "Paddleboards", "category": "Water", "availability": "Built in", "confirm": "Confirm life jackets" },
      { "name": "Paddle boats / water bikes", "category": "Water", "availability": "Review-confirmed", "confirm": "Confirm current inventory" },
      { "name": "Fishing", "category": "Water", "availability": "Review-confirmed", "confirm": "Confirm gear and licenses" },
      { "name": "Pickleball", "category": "Sports", "availability": "Built in", "confirm": "Confirm paddles, balls, and court lights; consider BYO" },
      { "name": "Basketball", "category": "Sports", "availability": "Built in", "confirm": "Confirm balls" },
      { "name": "Volleyball", "category": "Sports", "availability": "Review-confirmed", "confirm": "Confirm equipment" },
      { "name": "Cornhole / bags", "category": "Sports", "availability": "Review-confirmed", "confirm": "Confirm boards and bags" },
      { "name": "Four-hole disc golf", "category": "Sports", "availability": "Review-confirmed", "confirm": "Confirm discs" },
      { "name": "Tetherball", "category": "Sports", "availability": "Review-confirmed", "confirm": "Confirm ball" },
      { "name": "Bonfire / fire pit", "category": "Gathering", "availability": "Built in", "confirm": "Confirm firewood and weather plan" },
      { "name": "Outdoor fireplace / fire table", "category": "Gathering", "availability": "Built in", "confirm": "Confirm operating instructions" },
      { "name": "Wood-fired pizza oven", "category": "Food", "availability": "Built in", "confirm": "Confirm October use, cooks, tools, and firewood" },
      { "name": "Large grill", "category": "Food", "availability": "Built in", "confirm": "Confirm fuel and utensils" },
      { "name": "Home theater", "category": "Indoor", "availability": "Built in", "confirm": "Choose movie or video content" },
      { "name": "Karaoke", "category": "Indoor", "availability": "Review-confirmed", "confirm": "Confirm equipment" },
      { "name": "Pool table", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Ping pong", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Foosball", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Shuffleboard", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Retro arcade games", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Board games", "category": "Indoor", "availability": "Built in", "confirm": "Available" },
      { "name": "Quiet seating / reading areas", "category": "Rest", "availability": "Built in", "confirm": "Protect rest and conversation space" },
      { "name": "Lakefront prayer walk", "category": "Spiritual", "availability": "Built in", "confirm": "Map a route and weather backup / Scott to plan" },
      { "name": "Green space", "category": "Outdoor", "availability": "Built in", "confirm": "Available for group games or glow run/walk" }
    ]
  },
  "drinks": {
    "note": "Reference and decision options, not approved menu items.",
    "options": [
      { "name": "Golden Hour", "ingredients": "Espresso + honey + vanilla + milk + cinnamon cold foam", "feel": "Signature SHINE drink" },
      { "name": "The Spark", "ingredients": "Espresso + vanilla + orange + milk + vanilla cold foam", "feel": "Bright, different, memorable" },
      { "name": "Northwoods", "ingredients": "Espresso + real maple + brown sugar + milk + sea-salt cold foam", "feel": "Perfect for the cabin" },
      { "name": "Campfire", "ingredients": "Espresso + dark chocolate + toasted marshmallow + milk + cold foam", "feel": "Dessert drink" },
      { "name": "Daybreak", "ingredients": "Espresso + caramel + vanilla + milk + cinnamon", "feel": "Crowd pleaser" },
      { "name": "Wildflower", "ingredients": "Espresso + honey + lavender + oat milk", "feel": "Lighter/floral" },
      { "name": "Honeycomb", "ingredients": "Espresso + honey + brown sugar + milk + salted honey cold foam", "feel": "Rich but approachable" },
      { "name": "Sunshine", "ingredients": "Espresso + coconut + vanilla + milk + toasted coconut cold foam", "feel": "Fun/tropical" }
    ]
  }
}$json$::jsonb
where id = (
  select e.id from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026'
);
