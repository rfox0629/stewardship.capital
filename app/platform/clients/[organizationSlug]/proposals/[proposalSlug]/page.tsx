import { notFound, redirect } from "next/navigation";

import { sora } from "@app/tentmaiker/fonts";
import { platformClientPath } from "@lib/platform/engagement-href";
import { proposalFor } from "@lib/platform/proposals";
import { resolveAccess } from "@lib/spark/access";
import { PLATFORM_HOME, SPARK_ENTRY } from "@lib/spark/paths";
import { createClient } from "@lib/supabase/server";
import { ProposalDeck } from "../../../../_components/proposal/proposal-deck";

export const dynamic = "force-dynamic";

/**
 * A proposal, seen from inside the platform.
 *
 * Staff only, like everything under /platform. The deck is TentMAiKER's and
 * wears the client's colours; the only thing this frame adds is the way back
 * to the client's page. Someone outside staff reaches the same deck through a
 * share link at /p/<token>, never through this address.
 */

type PageProps = { params: Promise<{ organizationSlug: string; proposalSlug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { organizationSlug, proposalSlug } = await params;
  const proposal = proposalFor(organizationSlug, proposalSlug);
  /* Absolute, so the platform's own title template does not put the hosting
     company's name on the presenter's proposal. */
  return {
    title: { absolute: proposal ? `${proposal.title} | ${proposal.presenter.name}` : "Proposal" },
  };
}

export default async function ProposalPage({ params }: PageProps) {
  const { organizationSlug, proposalSlug } = await params;

  const supabase = await createClient().catch(() => null);
  const access = supabase ? await resolveAccess(supabase) : null;
  if (!supabase || !access) redirect(PLATFORM_HOME);
  if (!access.staff) redirect(SPARK_ENTRY);

  const proposal = proposalFor(organizationSlug, proposalSlug);
  if (!proposal) notFound();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", organizationSlug)
    .maybeSingle();

  return (
    <div className={sora.variable}>
      <ProposalDeck
        proposal={proposal}
        audience="staff"
        backHref={platformClientPath(organizationSlug)}
        backLabel={organization?.name ?? "Client"}
      />
    </div>
  );
}
