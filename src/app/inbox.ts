// Fila de notificações bancárias capturadas (lida do serviço nativo).
import { useCallback, useEffect, useState } from "react";
import { AppState, NativeModules } from "react-native";

const native = NativeModules.FlocoBankNotifications;

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
      setRows(JSON.parse(s.pending || "[]"));
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
  return { rows: rows.filter((r) => !registered.has(r.id)).sort((a, b) => b.postedAt - a.postedAt), status, refresh, dismiss, native };
}
