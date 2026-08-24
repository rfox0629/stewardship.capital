import { createClient } from "@supabase/supabase-js";

/**
 * What Supabase Auth is actually configured to do.
 *
 * Correct application code proves nothing about the project it runs against:
 * the email template, the code length, the redirect allow list and the signup
 * switch all live in the dashboard, and every one of them can silently
 * contradict the code. This reads back what it can observe and says plainly
 * what it cannot.
 *
 *   npm run audit:auth
 *
 * Read only. It creates nothing and sends nothing.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishable || !serviceRole) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ok = (label: string, detail = "") => console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
const bad = (label: string, detail = "") => console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
const info = (label: string, detail = "") => console.log(`  ....  ${label}${detail ? ` — ${detail}` : ""}`);

let failures = 0;
const fail = (label: string, detail = "") => {
  failures += 1;
  bad(label, detail);
};

console.log("");
console.log(`Auditing ${url}`);
console.log("");

/* ------------------------------------------------- public auth settings */

console.log("Signup and confirmation");
const settings = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: publishable },
}).then((response) => response.json());

if (settings.disable_signup === true) {
  ok("public signup is disabled");
} else {
  fail(
    "public signup is ENABLED",
    "anyone can create an account directly against the Auth API. They land on " +
      "Spark's quiet refusal because they hold no membership, but they should " +
      "not be able to create the account at all. Authentication, Sign In / Providers, " +
      "turn off Allow new users to sign up.",
  );
}

if (settings.mailer_autoconfirm === true) {
  fail(
    "email confirmation is OFF",
    "an address can be claimed without proving it is read, which is the whole " +
      "basis of Spark's identity check. Turn Confirm email back on.",
  );
} else {
  ok("email confirmation is required");
}

const providers = Object.entries(settings.external ?? {})
  .filter(([, enabled]) => enabled === true)
  .map(([name]) => name);

if (providers.length === 1 && providers[0] === "email") {
  ok("email is the only sign in provider");
} else {
  info(
    `providers enabled: ${providers.join(", ") || "none"}`,
    "anything beyond email is another way to become a verified identity. That " +
      "is not a way into a workspace, which still needs membership, but it should be deliberate.",
  );
}

/* --------------------------------------------------------- the OTP code */

console.log("");
console.log("The emailed code");

const probe = `config-audit-${crypto.randomUUID()}@spark-audit.invalid`;
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: probe,
  email_confirm: true,
});

if (createError || !created.user) {
  fail("could not probe the code format", createError?.message ?? "unknown");
} else {
  try {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: probe,
    });

    if (linkError || !link.properties) {
      fail("could not generate a link", linkError?.message ?? "unknown");
    } else {
      const code = link.properties.email_otp ?? "";
      if (code.length >= 8) {
        ok(`the code is ${code.length} digits`, "enough entropy for a raised rate limit");
      } else {
        fail(
          `the code is only ${code.length} digits`,
          "a six digit code is one million possibilities. Raising the verification " +
            "rate limit for shared venue wifi also raises what a guesser gets, so " +
            "lengthen the code first. Authentication, Sign In / Providers, Email, Email OTP Length: 8.",
        );
      }

      const action = new URL(link.properties.action_link);
      const redirectTo = action.searchParams.get("redirect_to");
      info("Site URL, as Supabase resolves it", redirectTo ?? "not present in the link");

      /* An emailed link that will carry a person to any host an attacker names
         is an open redirect wearing a verified session. */
      const evil = "https://evil.example.com/steal";
      const { data: redirected } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: probe,
        options: { redirectTo: evil },
      });

      const honoured = redirected?.properties
        ? new URL(redirected.properties.action_link).searchParams.get("redirect_to")
        : null;

      if (honoured && honoured.startsWith(evil)) {
        fail(
          "the redirect allow list accepts any host",
          `a link can be minted that sends a verified session to ${evil}. Authentication, ` +
            "URL Configuration, Redirect URLs: list only your own origins.",
        );
      } else {
        ok("the redirect allow list refuses unknown hosts", `fell back to ${honoured ?? "the site URL"}`);
      }
    }
  } finally {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
  }
}

/* ------------------------------------------------ what cannot be read back */

console.log("");
console.log("Not readable through the API, confirm these by eye");
info("Email template", "must contain {{ .Token }} or nobody receives a code");
info("Custom SMTP", "the built in sender allows a very small number of emails per hour");
info("Rate limits", "token verification and OTP requests, for shared venue wifi");

console.log("");
console.log(
  failures === 0
    ? "Nothing readable is misconfigured."
    : `${failures} setting${failures === 1 ? "" : "s"} to change in the dashboard.`,
);
console.log("");

process.exit(failures === 0 ? 0 : 1);
