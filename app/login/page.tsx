import Link from "next/link";

export default function LoginPage() {
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
            This is a static Sprint 1 shell. Authentication will be connected in
            a later step.
          </p>
        </div>

        <form className="auth-form">
          <label>
            Email
            <input type="email" name="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </label>
        </form>

        <Link className="button button-primary auth-submit" href="/dashboard">
          Continue to Dashboard Shell
        </Link>

        <p className="auth-switch">
          New to Stewardship Capital?{" "}
          <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
