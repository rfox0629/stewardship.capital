const stops = [
  {
    name: "Entrusted",
    copy: "Nothing here started with us. Time, talent, and treasure arrive as a trust.",
  },
  {
    name: "Understood",
    copy: "See the whole picture in one place before deciding anything.",
  },
  {
    name: "Ordered",
    copy: "Give the trust a structure. Owners, sequence, and a plan that holds.",
  },
  {
    name: "Multiplied",
    copy: "Grow capacity on purpose rather than by accident.",
  },
  {
    name: "Given",
    copy: "Release it toward family, work, generosity, and legacy.",
  },
];

export function MovementRail() {
  return (
    <div className="sc-rail" data-sc-track>
      <div className="sc-rail-track" aria-hidden="true">
        <span className="sc-rail-progress" />
      </div>

      <ol className="sc-rail-stops">
        {stops.map((stop, index) => (
          <li key={stop.name} data-sc-reveal style={{ transitionDelay: `${index * 70}ms` }}>
            <span className="sc-rail-dot" aria-hidden="true" />
            <p className="sc-rail-index">{String(index + 1).padStart(2, "0")}</p>
            <h3>{stop.name}</h3>
            <p className="sc-rail-copy">{stop.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
