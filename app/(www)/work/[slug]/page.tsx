import Link from "next/link";
import { notFound } from "next/navigation";

import { PanelField } from "../../_components/panel-field";
import { productBySlug, products } from "../../_lib/products";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = productBySlug(slug);
  return { title: product ? product.name : "Work" };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <section className="product-hero">
        <PanelField mode={product.mode} />
        <div className="product-hero-inner">
          <Link className="back" href="/work">
            Work
          </Link>
          <div className="panel-meta">
            <span className="panel-index">{product.index}</span>
            <span className="panel-category">{product.category}</span>
            <span className="chip" data-pending={product.pending ? "true" : undefined}>
              {product.status}
            </span>
          </div>
          <h1>{product.name}</h1>
          <p className="panel-prop" data-pending={product.pending ? "true" : undefined}>
            {product.proposition}
          </p>
        </div>
      </section>

      <section className="page">
        <div className="page-inner">
          {product.body && product.body.length > 0 ? (
            <div className="prose">
              {product.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="panel-prop" data-pending="true">
              This page is a slot. The full description of {product.name} has
              not been written yet.
            </p>
          )}

          {product.externalHref ? (
            <Link className="panel-cta" href={product.externalHref}>
              {product.externalLabel}
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M4 12h15M13 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}
