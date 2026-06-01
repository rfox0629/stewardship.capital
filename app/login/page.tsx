import Link from "next/link";

import { BrandMark } from "../brand-mark";
import { login } from "../auth/actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-story" aria-label="Stewardship Capital promise">
          <BrandMark className="auth-brand" href="/" />
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>Return to what God has entrusted to you.</h1>
            <p>
              Continue your stewardship dashboard, review saved progress, and
              take the next faithful step at your pace.
            </p>
          </div>
          <div className="auth-trust-list" aria-label="Assessment details">
            <span>Takes about 5 minutes</span>
            <span>Progress saves automatically</span>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-copy">
            <p className="eyebrow">Secure workspace</p>
            <h1 id="login-title">Log in to your stewardship workspace.</h1>
            <p>
              Access your protected dashboard and continue building clarity
              around your finances, family, legacy, and impact.
            </p>
          </div>

          {params.message ? (
            <p className="auth-notice">{params.message}</p>
          ) : null}
          {params.error ? <p className="auth-error">{params.error}</p> : null}

          <form className="auth-form" action={login}>
            <input
              type="hidden"
              name="redirectTo"
              value={params.redirectTo ?? "/dashboard"}
            />
            <label>
              Email
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>

            <button className="button button-primary auth-submit" type="submit">
              Log In
            </button>
          </form>

          <p className="auth-switch">
            New to Stewardship Capital?{" "}
            <Link href="/signup">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
