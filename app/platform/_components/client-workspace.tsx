import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import "./client-workspace.css";

import { shineBody, shineDisplay } from "@app/fonts";
import {
  clientThemeFor,
  clientThemeVariables,
  type ClientTheme,
} from "@lib/platform/client-themes";
import { PLATFORM_HOME } from "@lib/spark/paths";

/**
 * A client's own page on the platform.
 *
 * One frame for every client: the way back to the directory, the client's
 * website, the client's name in the client's type, and their projects as
 * cards. The client's identity comes in as a theme and nothing else, so a
 * second client is a second theme entry and the same layout, and a project's
 * own controls arrive as children so the frame never knows what a product is.
 */

export type ClientProject = {
  id: string;
  name: string;
  /** A quiet line under the name: status, date, place. */
  meta?: string;
  /** Where the project opens. A whole URL when it lives on another domain. */
  href: string;
  /** What sits behind Manage access, collapsed until asked for. */
  manage?: ReactNode;
};

type ClientWorkspaceProps = {
  client: { slug: string; name: string };
  projects: ClientProject[];
  /** Overrides the registry, for a page that already resolved the theme. */
  theme?: ClientTheme;
};

const fontClasses: Record<ClientTheme["fonts"], string> = {
  platform: "",
  shine: `${shineDisplay.variable} ${shineBody.variable} cw-fonts-shine`,
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

export function ClientWorkspace({ client, projects, theme }: ClientWorkspaceProps) {
  const resolved = theme ?? clientThemeFor(client.slug);
  const style = clientThemeVariables(resolved) as CSSProperties;
  const title = resolved.displayName ?? client.name;

  return (
    <div className={`cw ${fontClasses[resolved.fonts]}`.trim()} style={style}>
      <div className="cw-shell">
        <header className="cw-top">
          <Link className="cw-back" href={PLATFORM_HOME}>
            <span aria-hidden="true">&larr;</span> All clients
          </Link>
          {resolved.website ? (
            <a
              className="cw-site"
              href={resolved.website.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resolved.website.label} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </header>

        <main className="cw-main">
          <h1 className="cw-title">{title}</h1>

          <section className="cw-section" aria-labelledby="cw-projects-heading">
            <h2 id="cw-projects-heading" className="cw-heading">
              Projects
            </h2>

            {projects.length === 0 ? (
              <p className="cw-empty">No projects yet.</p>
            ) : (
              <ul className="cw-projects">
                {projects.map((project) => (
                  <li key={project.id} className="cw-project">
                    <div className="cw-project-head">
                      <div className="cw-project-name">
                        <h3>{project.name}</h3>
                        {project.meta ? (
                          <p className="cw-project-meta">{project.meta}</p>
                        ) : null}
                      </div>
                      {isExternal(project.href) ? (
                        <a className="cw-open" href={project.href}>
                          Open workspace <span aria-hidden="true">&rarr;</span>
                        </a>
                      ) : (
                        <Link className="cw-open" href={project.href}>
                          Open workspace <span aria-hidden="true">&rarr;</span>
                        </Link>
                      )}
                    </div>

                    {project.manage ? (
                      <details className="cw-manage">
                        <summary>
                          <span className="cw-manage-caret" aria-hidden="true" />
                          Manage access
                        </summary>
                        <div className="cw-manage-body">{project.manage}</div>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
