import Link from "next/link";

import { signOut } from "../../auth/actions";

const navigation = [
  { label: "Overview", href: "/dashboard" },
  { label: "Protect", href: "/dashboard/protect" },
  { label: "Grow", href: "/dashboard/grow" },
  { label: "Transfer", href: "/dashboard/transfer" },
  { label: "Impact", href: "/dashboard/impact" },
  { label: "Reports", href: "/dashboard/reports" },
];

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
        <nav className="app-nav">
          {navigation.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <p>Protected shell</p>
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
        <nav className="mobile-tab-nav" aria-label="Dashboard sections">
          {navigation.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
