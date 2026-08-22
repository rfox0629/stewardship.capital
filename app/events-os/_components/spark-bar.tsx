import Link from "next/link";

import { clientPath, plannerPath } from "../_lib/paths";
import type { Client, Edition } from "../_lib/types";
import { SparkMark } from "./spark-mark";

type SparkBarProps = {
  client?: Client;
  edition?: Edition;
};

/**
 * The whole of Spark's chrome above the section nav.
 *
 * Spark owns navigation, so the mark leads. The client and the event own
 * identity, so they appear as a control rather than as a decoration, and the
 * client name carries the client's own accent.
 */
export function SparkBar({ client, edition }: SparkBarProps) {
  return (
    <header className="eo-topbar">
      <div className="eo-topbar-inner">
        <Link className="eo-product" href={plannerPath()}>
          <SparkMark />
        </Link>

        {client ? (
          <div className="eo-crumbs">
            <Link className="eo-crumb-client" href={clientPath(client.slug)}>
              {client.name}
            </Link>
            {edition ? (
              <>
                <span aria-hidden="true">/</span>
                <span className="eo-crumb-current">{edition.label}</span>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="eo-topbar-right">
          <span className="eo-preview-flag">
            <span className="eo-preview-long">Founder preview, seeded data</span>
            <span className="eo-preview-short">Preview</span>
          </span>
        </div>
      </div>
    </header>
  );
}
