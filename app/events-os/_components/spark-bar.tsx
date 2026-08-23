import Link from "next/link";

import { clientPath, plannerPath } from "../_lib/paths";
import type { Client, Edition } from "../_lib/types";
import type { ViewerRole } from "../_lib/viewer";
import { SparkMark } from "./spark-mark";

type SparkBarProps = {
  client?: Client;
  edition?: Edition;
  /**
   * Only changes what the bar links to. The control for choosing a lens lives
   * in the preview strip below the nav, not in here, because this bar is the
   * one that ships.
   */
  viewer?: ViewerRole;
};

/**
 * The whole of Spark's chrome above the section nav.
 *
 * Spark owns navigation, so the mark leads. The client and the event own
 * identity, so they appear as a control rather than as a decoration, and the
 * client name carries the client's own accent.
 *
 * Only a planner gets the planner home as a destination. For a client or a
 * guest the mark is the product signature, not a way up and out into other
 * clients' events.
 */
export function SparkBar({ client, edition, viewer }: SparkBarProps) {
  const role = viewer ?? "planner";
  const isPlanner = role === "planner";

  return (
    <header className="eo-topbar">
      <div className="eo-topbar-inner">
        {isPlanner ? (
          <Link className="eo-product" href={plannerPath()}>
            <SparkMark />
          </Link>
        ) : (
          <span className="eo-product">
            <SparkMark />
          </span>
        )}

        {client ? (
          <div className="eo-crumbs">
            {isPlanner ? (
              <Link className="eo-crumb-client" href={clientPath(client.slug)}>
                {client.name}
              </Link>
            ) : (
              <span className="eo-crumb-client">{client.name}</span>
            )}
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
