const timestamp = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15;

function validSession(value) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    timestamp(value.startedAt) && timestamp(value.lastSeenAt) && value.startedAt <= value.lastSeenAt;
}

export function startSession(now) {
  return timestamp(now) ? { startedAt: now, lastSeenAt: now } : null;
}

export function resumeSession(saved, now, { maxIdleMinutes = 180 } = {}) {
  if (!timestamp(now)) return null;
  const idleLimit = Number.isFinite(maxIdleMinutes) && maxIdleMinutes >= 0 ? maxIdleMinutes : 180;
  if (!validSession(saved) || saved.lastSeenAt > now || (now - saved.lastSeenAt) / 60_000 >= idleLimit) {
    return startSession(now);
  }
  return { startedAt: saved.startedAt, lastSeenAt: now };
}

export function endSession() {
  return null;
}

export function serializeSession(session) {
  return JSON.stringify(validSession(session)
    ? { startedAt: session.startedAt, lastSeenAt: session.lastSeenAt }
    : null);
}

export function parseSession(text, now) {
  if (typeof text !== "string" || !timestamp(now)) return null;
  try {
    const session = JSON.parse(text);
    if (!validSession(session) || session.lastSeenAt > now) return null;
    return { startedAt: session.startedAt, lastSeenAt: session.lastSeenAt };
  } catch {
    return null;
  }
}

export { serializeSession as serialize, parseSession as parse };
