import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Box, Section, Toggle, Chips, Field, Muted, Button, T } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { reminderSettings, dueItems, overdueItems, overdueLabel, addDays } from "../reminders.mjs";
import { permission } from "../app/notify";
import { today } from "../finance.mjs";

export default function RemindersScreen() {
  const { c } = useTheme();
  const { state, perform, show, softFail } = useStore();
  const r = reminderSettings(state);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [times, setTimes] = useState({ morning: r.morning, evening: r.evening });
  useEffect(() => {
    permission(false).then(setGranted).catch(() => setGranted(false));
  }, []);
  const save = (patch: any) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, reminders: { ...reminderSettings(s), ...patch } } }), "Lembretes atualizados");
  const enable = async (v: boolean) => {
    if (v) {
      const ok = await permission(true);
      setGranted(ok);
      if (!ok) return;
    }
    save({ enabled: v });
  };
  const valid = (t: string) => !t || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  const currentDate = today();
  const overdue = overdueItems(state, currentDate);
  const next = dueItems(state, currentDate, addDays(currentDate, 7));
  return (
    <>
      {granted === false && (
        <Box>
          <T style={{ fontFamily: "SoraSemi" }}>Falta liberar as notificações</T>
          <Muted style={{ marginVertical: 8 }}>Sem a permissão do Android nenhum lembrete aparece. Suas escolhas aqui ficam guardadas.</Muted>
          <Button title="Abrir configurações do Android" secondary onPress={() => void Linking.openSettings().catch(() => softFail("Não foi possível abrir as configurações do Android."))} />
        </Box>
      )}
      <Box>
        <Toggle label="Lembretes de vencimento" value={r.enabled} onChange={enable} hint="Um resumo do que vence no dia: contas pendentes, faturas e recorrências." />
      </Box>
      {r.enabled && (
        <>
          <Section title="Horários" />
          <Box style={{ gap: 12 }}>
            <Field label="Manhã (HH:MM)" value={times.morning} onChange={(v) => setTimes({ ...times, morning: v })} maxLength={5} />
            <Field label="Noite (opcional, HH:MM)" value={times.evening} onChange={(v) => setTimes({ ...times, evening: v })} maxLength={5} />
            {!valid(times.morning) || !valid(times.evening) ? (
              <Muted style={{ color: c.red }}>Use o formato 08:00.</Muted>
            ) : (
              <Button title="Salvar horários" secondary onPress={() => save({ morning: times.morning || "08:00", evening: times.evening })} />
            )}
          </Box>
          <Section title="Avisar" />
          <Chips
            values={[
              ["0", "No dia"],
              ["1", "1 dia antes"],
              ["3", "3 dias antes"],
            ]}
            value={String(r.daysAhead) as "0"}
            onChange={(v) => save({ daysAhead: Number(v) })}
          />
          <Section title="Retorno" />
          <Muted>Se você passar dias sem abrir o Floco.</Muted>
          <Chips
            values={[
              ["0", "Nunca"],
              ["3", "3 dias"],
              ["7", "7 dias"],
              ["14", "14 dias"],
              ["30", "30 dias"],
            ]}
            value={String(r.comeback) as "0"}
            onChange={(v) => save({ comeback: Number(v) })}
          />
          <Box style={{ marginTop: 12 }}>
            <Toggle label="Avisar se ficar sem backup" value={r.backup} onChange={(v) => save({ backup: v })} hint="Um aviso quando o último backup tiver mais de 30 dias." />
          </Box>
        </>
      )}
      {!!overdue.length && (
        <>
          <Section title="Atrasadas" />
          <Box style={{ gap: 8 }}>
            {overdue.map((item: any) => (
              <View key={item.key}>
                <T>{item.kind === "pagar" ? "Pagar" : "Receber"} {item.label} · {show(item.amount)}</T>
                <Muted style={{ color: c.red }}>{overdueLabel(item.days)}</Muted>
              </View>
            ))}
          </Box>
        </>
      )}
      {(next.length > 0 || !overdue.length) && (
        <>
          <Section title="Próximos 7 dias" />
          <Box>
            {next.length ? (
              next.map((i: any, n: number) => (
                <Muted key={n}>
                  {i.date === currentDate ? "Vence hoje" : i.date.split("-").reverse().join("/").slice(0, 5)} · {i.kind === "pagar" ? "Pagar" : "Receber"} {i.label} · {show(i.amount)}
                </Muted>
              ))
            ) : (
              <Muted>Nada vence nos próximos 7 dias.</Muted>
            )}
          </Box>
        </>
      )}
    </>
  );
}
