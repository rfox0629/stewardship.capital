import { MultiplierField } from "./_components/multiplier-field";
import { Wordmark } from "./_components/wordmark";

/**
 * The approved hero composition, carrying one statement and nothing else.
 * No door, no explanation, nothing below the fold: the idea, stated once.
 */
export default function HomePage() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <MultiplierField />

      <div className="hero-inner">
        <div className="mask">
          <p className="hero-mark">
            <Wordmark />
          </p>
        </div>

        <div className="mask">
          <h1 id="hero-title">
            <span>Time.</span> <span>Talent.</span> <span>Treasure.</span>
          </h1>
        </div>

        <div className="mask">
          <p className="hero-sub">Steward what you&rsquo;ve been entrusted with.</p>
        </div>
      </div>
    </section>
  );
}
