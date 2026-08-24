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
      <main id="main">{children}</main>
    </div>
  );
}
