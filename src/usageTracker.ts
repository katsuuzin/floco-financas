// Liga o contador (usage.mjs) ao AsyncStorage. Só no aparelho; nada sai do app.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USAGE_KEY, emptyUsage, normalizeUsage, recordUse, resetUsage, usageKey } from "./usage.mjs";

let cache: ReturnType<typeof emptyUsage> | null = null;
let loading: Promise<ReturnType<typeof emptyUsage>> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

async function load() {
  if (cache) return cache;
  if (!loading) {
    loading = AsyncStorage.getItem(USAGE_KEY)
      .then((raw) => normalizeUsage(raw ? JSON.parse(raw) : null))
      .catch(() => emptyUsage())
      .then((u) => (cache = cache || u));
  }
  return loading;
}

function save() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    if (cache) AsyncStorage.setItem(USAGE_KEY, JSON.stringify(cache)).catch(() => {});
  }, 1500);
  listeners.forEach((f) => f());
}

export function trackUse(target: any) {
  const key = usageKey(target);
  if (!key) return;
  load().then((u) => {
    const next = recordUse(u, key);
    if (next !== u) {
      cache = next;
      save();
    }
  });
}

export const getUsage = () => load();
export const subscribeUsage = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export async function setUsageEnabled(enabled: boolean) {
  cache = { ...(await load()), enabled };
  save();
}
export async function clearUsage() {
  cache = resetUsage(await load());
  save();
}
