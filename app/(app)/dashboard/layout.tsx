import { BrandMark } from "../../brand-mark";
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
        <div className="app-sidebar-brand">
          <BrandMark className="app-brand" href="/" inverted />
          <p>Stewardship Operating System</p>
        </div>
        <DashboardNav variant="sidebar" />
        <div className="app-sidebar-footer">
          <p>Protected stewardship workspace</p>
          <form action={signOut}>
            <button className="app-logout-button" type="submit">
              Log Out
            </button>
          </form>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <BrandMark className="app-mobile-brand" href="/" />
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
