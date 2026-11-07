// Agenda os lembretes locais (S7). Tudo no aparelho; nada passa por servidor.
import * as Notifications from "expo-notifications";
import { Platform, NativeModules } from "react-native";
import { planReminders, reminderSettings } from "../reminders.mjs";
import { widgetData } from "../widgets.mjs";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function permission(ask = false) {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask) return current.granted;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

// Atualiza os widgets com o resumo formatado (W1).
export async function updateWidgets(state: any, protectedApp: boolean) {
  const native = NativeModules.FlocoWidgets;
  if (!native) return;
  try {
    await native.update(JSON.stringify(widgetData(state, { protectedApp })));
  } catch {
    /* widget é opcional */
  }
}

let running: Promise<void> | null = null;
// Refaz toda a agenda a partir do estado atual (chamado ao abrir e após mudanças).
export function reschedule(state: any) {
  const work = (async () => {
    if (Platform.OS !== "android") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!reminderSettings(state).enabled || !(await permission(false))) return;
    await Notifications.setNotificationChannelAsync("lembretes", {
      name: "Lembretes de vencimento",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    for (const r of planReminders(state, new Date())) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fire, channelId: "lembretes" },
      });
    }
  })();
  running = (running || Promise.resolve()).then(() => work).catch(() => {});
  return work;
}
