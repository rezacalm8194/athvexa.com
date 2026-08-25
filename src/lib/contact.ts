const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  const ascii = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[\s()-]/g, "");

  if (ascii.startsWith("00")) return `+${ascii.slice(2)}`;
  if (ascii.startsWith("0")) return `+98${ascii.slice(1)}`;
  if (/^9\d{9}$/.test(ascii)) return `+98${ascii}`;
  return ascii;
}

export function isValidPhone(value: string) {
  return /^\+[1-9]\d{9,14}$/.test(normalizePhone(value));
}

export function parseContact(value: string) {
  if (value.includes("@")) {
    const email = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? { type: "email" as const, value: email }
      : null;
  }

  const phone = normalizePhone(value);
  return isValidPhone(phone) ? { type: "phone" as const, value: phone } : null;
}
