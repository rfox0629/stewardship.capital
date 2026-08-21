export const metadata = { title: "Connect" };

export default function ConnectPage() {
  return (
    <section className="page">
      <div className="page-inner">
        <p className="section-eyebrow">Connect</p>
        <h1>
          Tell us what you
          <span>want built.</span>
        </h1>
        <p className="page-lede">
          If something has been entrusted to you and it is not moving yet, we
          would like to hear about it.
        </p>
        <a className="connect-link" href="mailto:hello@stewardship.capital">
          hello@stewardship.capital
        </a>
      </div>
    </section>
  );
}
