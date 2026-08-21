import Link from "next/link";

import { products } from "../_lib/products";

export const metadata = { title: "Work" };

export default function WorkPage() {
  return (
    <section className="page">
      <div className="page-inner">
        <p className="section-eyebrow">Work</p>
        <h1>What we&apos;re building.</h1>
        <p className="page-lede">
          A parent build company holds more than one thing at a time. This is
          the register.
        </p>

        <ul className="registry">
          {products.map((product) => (
            <li key={product.slug}>
              <Link href={`/work/${product.slug}`}>
                <span className="registry-index">{product.index}</span>
                <span className="registry-main">
                  <span className="registry-name">{product.name}</span>
                  <span className="registry-cat">{product.category}</span>
                </span>
                <span className="chip" data-pending={product.pending ? "true" : undefined}>
                  {product.status}
                </span>
              </Link>
            </li>
          ))}
          <li className="registry-open">
            <span className="registry-index">03</span>
            <span className="registry-main">
              <span className="registry-name">The next one</span>
              <span className="registry-cat">Capacity</span>
            </span>
            <span className="chip">Open</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
