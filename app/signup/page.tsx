import Link from "next/link";

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
      <section className="auth-panel" aria-labelledby="signup-title">
        <Link className="auth-brand" href="/">
          <span className="brand-monogram" aria-hidden="true">
            SC
          </span>
          <span>Stewardship Capital</span>
        </Link>

        <div className="auth-copy">
          <p className="eyebrow">Start your assessment</p>
          <h1 id="signup-title">Create your stewardship workspace.</h1>
          <p>
            Create an account with Supabase email auth. Assessment persistence
            and profile details come in later sprints.
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
    </main>
  );
}
