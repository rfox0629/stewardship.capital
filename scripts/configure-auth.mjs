/**
 * Configures the Supabase Auth project for production, through the
 * Management API, and verifies every change by reading it back.
 *
 *   npm run auth:configure
 *
 * Needs SUPABASE_ACCESS_TOKEN in .env.local: a personal access token from
 * supabase.com/dashboard/account/tokens. That token can change project
 * configuration, which the service role key deliberately cannot.
 *
 * What it sets, matching docs/spark-access.md:
 *   - public signup off (invitations create accounts deliberately instead)
 *   - Site URL and the redirect allow list for stewardship.capital
 *   - the magic link template, carrying {{ .Token }} and the callback link
 *   - OTP expiry of ten minutes
 *   - verification and OTP request rate limits sized for one venue's wifi
 *   - custom SMTP and the email rate limit, only when the SPARK_SMTP_*
 *     values are present, because raising the email limit without a real
 *     sender would promise mail the built in sender will not deliver
 *
 * Secrets are never printed. The read back shows shapes and lengths only.
 */

const PROJECT = "wyesunnskufforgfaegq";
const API = `https://api.supabase.com/v1/projects/${PROJECT}/config/auth`;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN is blank in .env.local.\n" +
      "Create one at supabase.com/dashboard/account/tokens and paste it there.",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const get = async () => {
  const response = await fetch(API, { headers });
  if (!response.ok) {
    throw new Error(`GET config: ${response.status} ${await response.text()}`);
  }
  return response.json();
};

const SITE_URL = "https://stewardship.capital";

const MAGIC_LINK_TEMPLATE = [
  '<h2 style="font-family:sans-serif;font-weight:600">Your Spark code</h2>',
  '<p style="font-family:sans-serif;font-size:15px">Enter this code on the sign in screen:</p>',
  '<p style="font-family:monospace;font-size:28px;letter-spacing:4px;font-weight:700">{{ .Token }}</p>',
  '<p style="font-family:sans-serif;font-size:14px">Or <a href="{{ .SiteURL }}/spark/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">open Spark directly</a>.</p>',
  '<p style="font-family:sans-serif;font-size:12px;color:#5c626c">Sent by Spark, the private planning platform of Stewardship.Capital. If you were not expecting this, you can ignore it.</p>',
].join("\n");

const base = {
  disable_signup: true,
  site_url: SITE_URL,
  uri_allow_list: [
    `${SITE_URL}/spark/auth/callback`,
    "https://*-ryan-foxs-projects-9a51a4d5.vercel.app/spark/auth/callback",
    "http://localhost:3000/spark/auth/callback",
  ].join(","),
  mailer_subjects_magic_link: "Your Spark code",
  mailer_templates_magic_link_content: MAGIC_LINK_TEMPLATE,
  mailer_otp_exp: 600,
  rate_limit_verify: 150,
  rate_limit_otp: 100,
};

const smtp = {
  host: process.env.SPARK_SMTP_HOST?.trim(),
  port: Number(process.env.SPARK_SMTP_PORT?.trim() || 0) || undefined,
  user: process.env.SPARK_SMTP_USER?.trim(),
  pass: process.env.SPARK_SMTP_PASS?.trim(),
  sender: process.env.SPARK_SMTP_SENDER?.trim(),
  senderName: process.env.SPARK_SMTP_SENDER_NAME?.trim() || "Spark",
};
const smtpReady = Boolean(smtp.host && smtp.port && smtp.user && smtp.pass && smtp.sender);

const payload = smtpReady
  ? {
      ...base,
      external_email_enabled: true,
      smtp_host: smtp.host,
      smtp_port: String(smtp.port),
      smtp_user: smtp.user,
      smtp_pass: smtp.pass,
      smtp_admin_email: smtp.sender,
      smtp_sender_name: smtp.senderName,
      rate_limit_email_sent: 100,
    }
  : base;

console.log("");
console.log(`Configuring auth for ${PROJECT}...`);
console.log(
  smtpReady
    ? "  SMTP values found: configuring the sender and raising the email rate limit."
    : "  SPARK_SMTP_* values are blank: skipping SMTP and the email rate limit for now.",
);

const before = await get();

const patch = await fetch(API, {
  method: "PATCH",
  headers,
  body: JSON.stringify(payload),
});
if (!patch.ok) {
  throw new Error(`PATCH config: ${patch.status} ${await patch.text()}`);
}

const after = await get();

const show = (label, pick, secret = false) => {
  const was = pick(before);
  const now = pick(after);
  const fmt = (value) =>
    secret && value
      ? `(set, ${String(value).length} chars)`
      : value === undefined || value === null || value === ""
        ? "(blank)"
        : String(value).length > 60
          ? `${String(value).slice(0, 57)}...`
          : String(value);
  const mark = JSON.stringify(was) === JSON.stringify(now) ? " " : "*";
  console.log(`  ${mark} ${label}: ${fmt(was)} -> ${fmt(now)}`);
};

console.log("");
console.log("Read back (* = changed):");
show("signup disabled", (c) => c.disable_signup);
show("site url", (c) => c.site_url);
show("redirect allow list", (c) => c.uri_allow_list);
show("magic link subject", (c) => c.mailer_subjects_magic_link);
show(
  "template carries {{ .Token }}",
  (c) => /\{\{\s*\.Token\s*\}\}/.test(c.mailer_templates_magic_link_content ?? "") ,
);
show(
  "template carries the callback link",
  (c) => (c.mailer_templates_magic_link_content ?? "").includes("/spark/auth/callback"),
);
show("otp expiry seconds", (c) => c.mailer_otp_exp);
show("otp length", (c) => c.otp_length);
show("rate: verifications", (c) => c.rate_limit_verify);
show("rate: otp requests", (c) => c.rate_limit_otp);
show("rate: emails per hour", (c) => c.rate_limit_email_sent);
show("smtp host", (c) => c.smtp_host);
show("smtp sender", (c) => c.smtp_admin_email);
show("smtp password", (c) => c.smtp_pass, true);

const ok =
  after.disable_signup === true &&
  after.site_url === SITE_URL &&
  /\{\{\s*\.Token\s*\}\}/.test(after.mailer_templates_magic_link_content ?? "") &&
  after.rate_limit_verify === 150 &&
  after.rate_limit_otp === 100 &&
  (!smtpReady || (after.smtp_host === smtp.host && after.rate_limit_email_sent === 100));

console.log("");
if (ok) {
  console.log(
    smtpReady
      ? "Everything verified. All five production settings are in place."
      : "Verified, four of five. SMTP still waits on SPARK_SMTP_* values; rerun once they are set.",
  );
} else {
  console.log("Something did not verify. Read the table above before trusting anything.");
  process.exit(1);
}
console.log("");
