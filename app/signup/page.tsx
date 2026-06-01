import Link from "next/link";

import { BrandMark } from "../brand-mark";
import { signup } from "../auth/actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-story" aria-label="Stewardship Capital promise">
          <BrandMark className="auth-brand" href="/" />
          <div>
            <p className="eyebrow">Start your assessment</p>
            <h1>Steward what matters most with clarity.</h1>
            <p>
              Create your workspace, take a fast diagnostic, and receive a
              dashboard shaped around Protect, Grow, Transfer, and Impact.
            </p>
          </div>
          <div className="auth-trust-list" aria-label="Assessment details">
            <span>Takes about 5 minutes</span>
            <span>Progress saves automatically</span>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="signup-title">
          <div className="auth-copy">
            <p className="eyebrow">Create account</p>
            <h1 id="signup-title">Create your stewardship workspace.</h1>
            <p>
              Begin with simple questions. No dollar amounts, uploads, or
              account connections are required for the first assessment.
            </p>
          </div>

          {params.error ? <p className="auth-error">{params.error}</p> : null}

          <form className="auth-form" action={signup}>
            <label>
              Full name
              <input type="text" name="name" autoComplete="name" required />
            </label>
            <label>
              Email
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <button className="button button-primary auth-submit" type="submit">
              Create Account
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
