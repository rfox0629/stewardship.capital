import { memoryConsumedInvitations } from "./invitations.ts";

/**
 * The record of accepted invitations.
 *
 * In memory, so single use holds within a process and is what the tests
 * exercise. A deployed Spark needs this to be a table: serverless instances do
 * not share memory, so today an invitation could be accepted once per
 * instance. This is the single place to swap.
 */
export const consumedInvitations = memoryConsumedInvitations();
