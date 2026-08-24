-- Take anon off the Spark tables entirely.
--
-- Row level security already stops an anonymous caller, because no policy
-- grants anon anything. This removes the table privilege as well, so a future
-- policy written carelessly with `to public` cannot quietly open a door that
-- was only ever closed by one layer.
--
-- Deliberately not using `force row level security`. It would make the table
-- owner subject to policies too, which sounds stricter but only protects
-- against the application connecting as the owner, which it never does:
-- PostgREST connects as anon or authenticated, and server side work uses the
-- service role. The real cost would be that every future data migration runs
-- as the owner and would start failing. Not a trade worth making.

revoke all on public.organizations from anon;
revoke all on public.engagements from anon;
revoke all on public.workspace_members from anon;
revoke all on public.platform_staff from anon;
revoke all on public.invitations from anon;
revoke all on public.sparks from anon;
revoke all on public.schedule_items from anon;
revoke all on public.budget_lines from anon;
revoke all on public.tasks from anon;
revoke all on public.resources from anon;
revoke all on public.run_of_show_cues from anon;
revoke all on public.decisions from anon;

-- The helper functions are not anon's business either.
revoke all on function public.is_platform_staff() from anon;
revoke all on function public.engagement_role(uuid) from anon;
revoke all on function public.is_engagement_member(uuid) from anon;
revoke all on function public.is_engagement_planner(uuid) from anon;
