import Link from "next/link";

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
          <p>Static protected shell</p>
          <Link href="/login">Log Out</Link>
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
          <Link className="app-login-link" href="/login">
            Log Out
          </Link>
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
