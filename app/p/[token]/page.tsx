import { notFound } from "next/navigation";

import { sora } from "@app/tentmaiker/fonts";
import { findLiveShare, recordShareOpened } from "@lib/platform/proposal-shares";
import { proposalFor } from "@lib/platform/proposals";
import { createAdminClient } from "@lib/supabase/admin";
import { ProposalDeck } from "../../platform/_components/proposal/proposal-deck";

export const dynamic = "force-dynamic";

/**
 * A proposal opened by its share link.
 *
 * The token is the authorization: staff issued it to a named person for a
 * bounded time, and it opens this one proposal and nothing else. There is
 * no session here and nothing to sign in to. A link that is unknown,
 * expired, or revoked is a plain 404, the same for every cause, so the
 * address cannot be used to learn which links exist.
 *
 * The deck's demo runs on fixture data in code. No ministry record is read.
 */

type PageProps = { params: Promise<{ token: string }> };

const organizationSlugFor = async (organizationId: string): Promise<string | null> => {
  try {
    const { data } = await createAdminClient()
      .from("organizations")
      .select("slug")
      .eq("id", organizationId)
      .maybeSingle();
    return data?.slug ? String(data.slug) : null;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const share = await findLiveShare(token);
  if (!share) return { title: "Proposal" };
  const slug = await organizationSlugFor(share.organizationId);
  const proposal = slug ? proposalFor(slug, share.proposalSlug) : null;
  return { title: proposal?.title ?? "Proposal" };
}

export default async function SharedProposalPage({ params }: PageProps) {
  const { token } = await params;
  const share = await findLiveShare(token);
  if (!share) notFound();

  const organizationSlug = await organizationSlugFor(share.organizationId);
  const proposal = organizationSlug ? proposalFor(organizationSlug, share.proposalSlug) : null;
  if (!proposal) notFound();

  await recordShareOpened(share);

  return (
    <div className={sora.variable}>
      <ProposalDeck proposal={proposal} audience="shared" sharedWith={share.label} />
    </div>
  );
}
