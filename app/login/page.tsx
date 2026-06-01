import Link from "next/link";

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
      <section className="auth-panel" aria-labelledby="login-title">
        <Link className="auth-brand" href="/">
          <span className="brand-monogram" aria-hidden="true">
            SC
          </span>
          <span>Stewardship Capital</span>
        </Link>

        <div className="auth-copy">
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-title">Log in to your stewardship workspace.</h1>
          <p>
            Access your protected stewardship dashboard. Supabase credentials
            must be configured before live sign-in will work.
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
    </main>
  );
}
