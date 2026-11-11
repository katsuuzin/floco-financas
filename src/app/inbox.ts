// Fila de notificações bancárias capturadas (lida do serviço nativo).
import { useCallback, useEffect, useState } from "react";
import { AppState, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDuplicateNotification, rememberNotification } from "../notificationDedupe.mjs";
import { dedupeInbox, isDenied } from "../notification-import.mjs";
import { notifySettings } from "../bankCatalog.mjs";

const native = NativeModules.FlocoBankNotifications;
const seenKey = "floco.bankNotificationSeen";
let refreshLedger = Promise.resolve();

async function groupNotifications(rows: any[]) {
  let previous: any;
  try { previous = JSON.parse((await AsyncStorage.getItem(seenKey)) || "[]"); } catch { previous = []; }
  const now = Date.now();
  let ledger: any[] = rememberNotification(Array.isArray(previous) ? previous.slice(-500) : [], null, now);
  const hidden = new Set<string>();
  for (const row of [...rows].sort((a, b) => a.postedAt - b.postedAt)) {
    if (typeof row.id !== "string" || ledger.some((entry) => entry.id === row.id)) continue;
    const channel = row.source === "sms" ? "sms" : "push";
    const otherChannel = ledger.filter((entry) => (entry.channel === "sms" || entry.channel === "push") && entry.channel !== channel);
    if (isDuplicateNotification(otherChannel, row)) {
      hidden.add(row.id);
      continue;
    }
    const [entry] = rememberNotification([], row, now);
    if (entry) ledger = [...ledger, { ...entry, id: row.id, channel }].slice(-500);
  }
  try { await AsyncStorage.setItem(seenKey, JSON.stringify(ledger)); } catch { /* a fila continua disponível */ }
  return hidden;
}

export type InboxStatus = {
  available: boolean;
  permission: boolean;
  enabled: boolean;
  connected: boolean;
  lastCapture: number;
  lastSeen: { package?: string; bank?: string; time?: number; reason?: string } | null;
  overflow: number;
  storageError: boolean;
};

export function useBankInbox(state: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<InboxStatus | null>(null);
  const refresh = useCallback(async () => {
    if (!native) {
      setStatus({ available: false, permission: false, enabled: false, connected: false, lastCapture: 0, lastSeen: null, overflow: 0, storageError: false });
      return;
    }
    try {
      const s = await native.status();
      let lastSeen = null;
      try {
        lastSeen = s.lastSeen ? JSON.parse(s.lastSeen) : null;
      } catch {}
      setStatus({ available: true, permission: !!s.permission, enabled: s.enabled !== false, connected: !!s.connected, lastCapture: s.lastCapture || 0, lastSeen, overflow: s.overflow || 0, storageError: !!s.storageError });
      const pending = JSON.parse(s.pending || "[]");
      if (Array.isArray(pending)) {
        const current = refreshLedger.then(async () => {
          const hidden = await groupNotifications(pending.filter((row) => row && typeof row === "object"));
          setRows(pending.filter((row) => row && typeof row === "object"));
          setHiddenIds(hidden);
        });
        refreshLedger = current.catch(() => {});
        await current;
      }
      if (s.permission && !s.connected && native.rebind) native.rebind().catch(() => {});
    } catch {
      /* mantém o último estado */
    }
  }, []);
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void refresh());
    const timer = setInterval(refresh, 15000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  const dismiss = useCallback(
    async (id: string) => {
      if (native) await native.acknowledge(id);
      await refresh();
    },
    [refresh],
  );
  // Já registradas somem da fila automaticamente.
  const registered = new Set(state.transactions.map((t: any) => t.notificationId).filter(Boolean));
  useEffect(() => {
    for (const r of rows) if (registered.has(r.id)) void dismiss(r.id);
  }, [rows.length, state.transactions.length]);
  // Compras negadas não cobram nada: com a opção ligada (padrão) saem da fila sozinhas.
  const skipDenied = notifySettings(state).ignoreDenied !== false;
  const denied = skipDenied ? rows.filter((r) => isDenied(r)) : [];
  useEffect(() => {
    for (const r of denied) void dismiss(r.id);
  }, [denied.map((r) => r.id).join(",")]);
  const hide = new Set(denied.map((r) => r.id));
  const { unique, duplicates } = dedupeInbox(rows.filter((r) => !registered.has(r.id) && !hide.has(r.id)));
  return {
    rows: unique.filter((row) => !hiddenIds.has(row.id)),
    hiddenRows: unique.filter((row) => hiddenIds.has(row.id)),
    possibleDuplicates: new Set([...duplicates, ...hiddenIds]),
    status, refresh, dismiss, native,
  };
}
