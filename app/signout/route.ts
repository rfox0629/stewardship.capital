import { NextResponse, type NextRequest } from "next/server";

import {
  CHALLENGE_COOKIE,
  PENDING_COOKIE,
  SESSION_COOKIE,
  VIEWER_COOKIE,
} from "../../lib/spark/session";

/** Leaves Spark and returns to the front door. */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/more", request.url));
  [SESSION_COOKIE, VIEWER_COOKIE, PENDING_COOKIE, CHALLENGE_COOKIE].forEach(
    (name) => response.cookies.delete(name),
  );
  return response;
}
