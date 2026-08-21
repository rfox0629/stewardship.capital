import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel, Pill, Workflow } from "@events/_components/ui";
import { shortDate } from "@events/_lib/format";
import { editionPath } from "@events/_lib/paths";
import type { EditionRouteParams } from "@events/_lib/paths";
import {
  buildTargetLabel,
  decisionsFor,
  resolveEdition,
  sparkById,
} from "@events/_lib/store";
import type { SparkBuildKind, SparkStatus } from "@events/_lib/types";

type PageProps = {
  params: Promise<EditionRouteParams & { sparkId: string }>;
};

const kindLabel: Record<SparkBuildKind, string> = {
  schedule: "Schedule",
  budget: "Budget",
  task: "Task",
  resource: "Resource",
  runOfShow: "Run of show",
  guestComms: "Guest comms",
};

const kindSegment: Record<SparkBuildKind, string> = {
  schedule: "schedule",
  budget: "budget",
  task: "tasks",
  resource: "resources",
  runOfShow: "run-of-show",
  guestComms: "tasks",
};

const statusTone = (status: SparkStatus) =>
  status === "approved"
    ? "good"
    : status === "declined"
      ? "stop"
      : status === "discussing"
        ? "warn"
        : "neutral";

const whereInFlow = (status: SparkStatus) =>
  status === "captured"
    ? "Spark"
    : status === "discussing"
      ? "Discuss"
      : status === "approved"
        ? "Build"
        : "Approve";

export async function generateMetadata({ params }: PageProps) {
  const { sparkId } = await params;
  const spark = sparkById(sparkId);
  return { title: spark ? spark.title : "Spark" };
}

export default async function SparkDetailPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition: editionSlug, sparkId } = await params;
  const resolved = resolveEdition(clientSlug, eventSlug, editionSlug);
  if (!resolved) notFound();

  const spark = sparkById(sparkId);
  if (!spark || spark.editionId !== resolved.edition.id) notFound();

  const { client, event, edition } = resolved;
  const base = (segment: string) =>
    editionPath(client.slug, event.slug, edition.slug, segment);

  const linkedDecision = decisionsFor(edition.id).find(
    (decision) => decision.sparkId === spark.id,
  );

  return (
    <main className="eo-page">
      <div className="eo-shell">
        <Link className="eo-back" href={base("sparks")}>
          Back to Sparks
        </Link>

        <div className="eo-page-head">
          <p className="eo-eyebrow">
            Spark, {spark.category.toLowerCase()}, raised by {spark.raisedBy} on{" "}
            {shortDate(spark.raisedOn)}
          </p>
          <h1>{spark.title}</h1>
          <p>{spark.detail}</p>
          <div style={{ marginTop: 12 }}>
            <Pill tone={statusTone(spark.status)}>{spark.status}</Pill>
          </div>
        </div>

        <Workflow here={whereInFlow(spark.status)} />

        <div className="eo-grid eo-grid-2">
          <div className="eo-grid">
            <Panel title="Decision">
              {spark.decision ? (
                <>
                  <p style={{ color: "var(--eo-ink)" }}>{spark.decision}</p>
                  <p className="eo-note" style={{ marginTop: 8 }}>
                    Decided {spark.decidedOn ? shortDate(spark.decidedOn) : "recently"}.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Not decided yet. This spark is still in{" "}
                    {spark.status === "captured" ? "Capture" : "Discuss"}.
                  </p>
                  {linkedDecision ? (
                    <p className="eo-note" style={{ marginTop: 10 }}>
                      Open decision, needed by {shortDate(linkedDecision.needsBy)}.{" "}
                      <Link className="eo-panel-link" href={base("meeting")}>
                        Take it to the meeting
                      </Link>
                    </p>
                  ) : (
                    <p className="eo-note" style={{ marginTop: 10 }}>
                      Add it to a meeting agenda to move it forward.
                    </p>
                  )}
                </>
              )}
            </Panel>

            <Panel title="What approving this creates">
              {spark.status === "approved" && spark.builds ? (
                <div className="eo-convert">
                  {spark.builds.map((build) => (
                    <div className="eo-convert-step" key={`${build.kind}-${build.refId}`}>
                      <span className="eo-convert-kind">{kindLabel[build.kind]}</span>
                      <div className="eo-row-main">
                        <div className="eo-row-title">
                          {buildTargetLabel(build.kind, build.refId) ?? build.label}
                        </div>
                        <p className="eo-row-meta">
                          <Link
                            className="eo-panel-link"
                            href={base(kindSegment[build.kind])}
                          >
                            Open in {kindLabel[build.kind].toLowerCase()}
                          </Link>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p>
                    Nothing yet. When this spark is approved it can create any of
                    the following, and each one keeps a link back here.
                  </p>
                  <div className="eo-convert" style={{ marginTop: 14 }}>
                    {(
                      [
                        "schedule",
                        "budget",
                        "task",
                        "resource",
                        "runOfShow",
                        "guestComms",
                      ] as SparkBuildKind[]
                    ).map((kind) => (
                      <div className="eo-convert-step" key={kind}>
                        <span className="eo-convert-kind">{kindLabel[kind]}</span>
                        <div className="eo-row-main">
                          <p className="eo-note" style={{ marginTop: 2 }}>
                            Not created
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </div>

          <Panel title="Why this matters">
            <p>
              A plan gets unusable when ideas and commitments live in the same
              list. Keeping sparks separate means the confirmed schedule only
              ever contains things someone actually decided.
            </p>
            <p style={{ marginTop: 12 }}>
              Every schedule item, budget line, task, and supply created from a
              spark keeps a link back to it, so six months later anyone can ask
              why a line exists and get an answer.
            </p>
          </Panel>
        </div>
      </div>
    </main>
  );
}
