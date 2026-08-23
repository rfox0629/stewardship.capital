export const metadata = { title: "About" };

const forms = [
  "Ideas",
  "Relationships",
  "Experience",
  "Technology",
  "Influence",
  "Companies",
  "Time",
];

export default function AboutPage() {
  return (
    <section className="page">
      <div className="page-inner">
        <p className="section-eyebrow">About</p>
        <h1>
          Capital is more
          <span>than money.</span>
        </h1>

        <ul className="forms" aria-label="Forms of capital">
          {forms.map((form, index) => (
            <li key={form} style={{ animationDelay: `${index * 70}ms` }}>
              <span className="forms-dot" aria-hidden="true" />
              {form}
            </li>
          ))}
        </ul>

        <div className="prose">
          <p>
            Everything entrusted can be multiplied. That is the whole idea, and
            it is the reason this company exists in the shape it does.
          </p>
          <p>
            Stewardship.Capital is a parent build company. Entrusted ideas,
            opportunities, companies, relationships, technology, and resources
            come in. Systems, products, and experiences built to move come out.
          </p>
          <p>
            We would rather hold a small number of things and build them
            properly than hold a large number and explain them well.
          </p>
        </div>
      </div>
    </section>
  );
}
