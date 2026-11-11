import { suggestNotification, KIND_LABEL } from "./notification-import.mjs";
import { safeCentsFromBr, safeIsIsoDate } from "./hardened.mjs";
import { normalizeSearchText } from "./shoppingSearch.mjs";

const cap = 500;
const ttl = 24 * 60 * 60 * 1000;
const minute = 60_000;
const defaultWindow = 120_000;
const validTime = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 8.64e15;
const timeOf = (value) => validTime(value) ? value : typeof value === "string" &&
  safeIsIsoDate(value.slice(0, 10)) && /T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : NaN;
const clean = (value) => normalizeSearchText(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const generic = new Set(Object.values(KIND_LABEL).map(clean));
const own = (object, key) => object && typeof object === "object" && Object.hasOwn(object, key) ? object[key] : undefined;
const str = (value) => typeof value === "string" ? value.slice(0, 1500) : "";

function record(notification) {
  const bank = clean(str(own(notification, "bank")).replace(/^(?:sms|push)\s*[·:–-]\s*/iu, ""));
  const postedAt = timeOf(own(notification, "postedAt") ?? own(notification, "timestamp"));
  if (!bank || !validTime(postedAt)) return null;
  const explicitMerchant = own(notification, "merchant") ?? own(notification, "establishment") ?? own(notification, "description");
  const explicitAmount = own(notification, "amountCents") ?? own(notification, "amount");
  const type = own(notification, "type");
  const suggested = suggestNotification({ bank, postedAt, title: str(own(notification, "title")), text: str(own(notification, "text")) });
  if (suggested.kind === "denied") return null;
  const amount = Number.isSafeInteger(explicitAmount) ? explicitAmount :
    safeCentsFromBr(typeof explicitAmount === "string" ? explicitAmount : suggested.amount);
  const merchant = clean(str(explicitMerchant ?? suggested.description)
    .replace(/\s+(?:no|com o|para o)\s+cart[aã]o\b.*$/iu, "")
    .replace(/\s+(?:via\s+pix|cart[aã]o\s+final\s+\d{4})\b.*$/iu, ""));
  if (!Number.isSafeInteger(amount) || amount <= 0 || !merchant || merchant === bank || generic.has(merchant)) return null;
  const direction = type === "income" || type === "expense" ? type : suggested.type;
  return { key: JSON.stringify([bank, amount, merchant, direction]), postedAt };
}

export function notificationFingerprint(notification) {
  const row = record(notification);
  return row ? row.key + "|" + Math.round(row.postedAt / minute) : null;
}

const safeSeen = (seen) => (Array.isArray(seen) ? seen : []).filter((row) =>
  typeof own(row, "key") === "string" && row.key.length <= 4000 && validTime(own(row, "postedAt")) && validTime(own(row, "seenAt")));

export function isDuplicateNotification(seen, notification, { windowMs = defaultWindow } = {}) {
  const row = record(notification);
  const window = Number.isSafeInteger(windowMs) && windowMs >= 0 ? windowMs : defaultWindow;
  return !!row && safeSeen(seen).some((entry) => entry.key === row.key && Math.abs(entry.postedAt - row.postedAt) <= window);
}

export function rememberNotification(seen, notification, now) {
  const time = timeOf(now);
  if (!validTime(time)) return safeSeen(seen).slice(-cap);
  const kept = safeSeen(seen).filter((row) => row.seenAt <= time && time - row.seenAt <= ttl);
  const entry = record(notification);
  const next = entry ? [...kept.filter((row) => row.key !== entry.key || row.postedAt !== entry.postedAt), { ...entry, seenAt: time }] : kept;
  return next.sort((a, b) => a.seenAt - b.seenAt).slice(-cap);
}
