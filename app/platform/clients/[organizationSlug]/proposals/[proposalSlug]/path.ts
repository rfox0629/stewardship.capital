/** A proposal's address inside the platform, for staff. */
export const proposalPath = (organizationSlug: string, proposalSlug: string) =>
  `/platform/clients/${organizationSlug}/proposals/${proposalSlug}`;
