import Link from "next/link";

export default function SignupPage() {
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
            This static signup shell prepares the account flow without
            connecting a real auth provider yet.
          </p>
        </div>

        <form className="auth-form">
          <label>
            Full name
            <input type="text" name="name" autoComplete="name" />
          </label>
          <label>
            Email
            <input type="email" name="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
            />
          </label>
        </form>

        <Link className="button button-primary auth-submit" href="/dashboard">
          Continue to Dashboard Shell
        </Link>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
