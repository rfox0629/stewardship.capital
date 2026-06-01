import Link from "next/link";

import { signOut } from "../../auth/actions";
import { DashboardNav } from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Dashboard navigation">
        <Link className="app-brand" href="/">
          <span className="brand-monogram" aria-hidden="true">
            SC
          </span>
          <span>Stewardship Capital</span>
        </Link>
        <DashboardNav variant="sidebar" />
        <div className="app-sidebar-footer">
          <p>Stewardship dashboard</p>
          <form action={signOut}>
            <button className="app-logout-button" type="submit">
              Log Out
            </button>
          </form>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <Link className="app-mobile-brand" href="/">
            <span className="brand-monogram" aria-hidden="true">
              SC
            </span>
            <span>Stewardship Capital</span>
          </Link>
          <form action={signOut}>
            <button className="app-login-link" type="submit">
              Log Out
            </button>
          </form>
        </header>
        <DashboardNav variant="mobile" />
        {children}
      </div>
    </div>
  );
}
