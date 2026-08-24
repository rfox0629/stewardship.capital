/** Enough to recognise your own address, not enough to learn someone else's. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return "your address";
  return `${name.slice(0, 1)}${"•".repeat(Math.max(name.length - 1, 1))}@${domain}`;
};
