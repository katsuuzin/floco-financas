// Agenda os lembretes locais (S7). Tudo no aparelho; nada passa por servidor.
import * as Notifications from "expo-notifications";
import { Platform, NativeModules } from "react-native";
import { planReminders, reminderSettings } from "../reminders.mjs";
import { widgetData } from "../widgets.mjs";
import { pickAlerts, runningLow } from "../shoppingRunOut.mjs";
import { today } from "../finance.mjs";
import { productKey } from "../shoppingPurchases.mjs";

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
  const work = (running || Promise.resolve()).then(async () => {
    if (Platform.OS !== "android") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const reminders = reminderSettings(state).enabled;
    if ((!reminders && state.shoppingRunOutAlerts !== true) || !(await permission(false))) return;
    if (reminders) {
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
    }
    if (state.shoppingRunOutAlerts !== true) return;
    const channelId = "reposicao";
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Reposição de compras", importance: Notifications.AndroidImportance.DEFAULT,
    });
    const fire = new Date();
    fire.setHours(9, 0, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
    const pending = new Set((state.shoppingItems || []).filter((item: any) => !item.inCart).map((item: any) => productKey(item.name, item.unit)));
    const products = new Map((state.shoppingProducts || []).map((product: any) => [product.id, product]));
    const candidates = runningLow(state, today()).filter((item: any) =>
      !pending.has(productKey(item.name, (products.get(item.productId) as any)?.unit)));
    const alerts = pickAlerts(candidates, { now: +fire, quiet: { offsetMinutes: -fire.getTimezoneOffset() } } as Parameters<typeof pickAlerts>[1]);
    for (const [index, item] of alerts.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `shopping-restock-${index}`,
        content: { title: "Está acabando", body: state.settings?.hide ? "Abra a lista de compras para ver o que repor." : `Confira se precisa repor ${item.name}.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId },
      });
    }
  });
  running = work.catch(() => {});
  return running;
}
