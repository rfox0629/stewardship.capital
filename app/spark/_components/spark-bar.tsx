import Link from "next/link";

import { clientPath } from "@spark/_lib/paths";
import type { Client, Edition } from "@spark/_lib/types";
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
        {/* The front door, not the platform home. It routes each person to
            what they can actually reach, so the mark never leads anyone into
            a refusal. */}
        <Link className="eo-product" href="/spark">
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
          {/* A real form, so signing out is a POST and cannot be triggered by
              someone else's page embedding a link to it. */}
          <form action="/spark/signout" method="post">
            <button className="eo-signout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
