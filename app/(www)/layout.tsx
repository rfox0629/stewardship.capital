import { SiteNav } from "./_components/site-nav";
import "../styles/site.css";

export default function WwwLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="www">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteNav />
      <main id="main">{children}</main>
    </div>
  );
}
