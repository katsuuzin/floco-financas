import React from "react";
import { View } from "react-native";
import { Box, Button, Empty, IconButton, Muted, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { daysLeft, emptyTrash, purgeTrash, TRASH_DAYS } from "../trash.mjs";
import { emptyTrashPlan, planPurge, restoreFromTrash } from "../trashPurge.mjs";

// S11: lançamentos excluídos, com restaurar, apagar de vez e esvaziar.
export default function TrashScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const items: any[] = state.trash || [];
  const now = Date.now();
  const invalid = new Set(planPurge(items, { now } as Parameters<typeof planPurge>[1]).reasons.flatMap((reason) => reason.code === "data_invalida" && "index" in reason ? [reason.index] : []));
  const plan = emptyTrashPlan(items);
  const restore = (id: string) => void perform((s: any) => {
    const next = restoreFromTrash(s, id);
    if (next.error) throw Error(next.error);
    return next;
  }, "Lançamento restaurado");
  if (!items.length)
    return <Empty title="Lixeira vazia" body={`Lançamentos excluídos ficam aqui por ${TRASH_DAYS} dias e podem ser restaurados.`} />;
  return (
    <>
      <Muted style={{ marginBottom: 10 }}>
        Itens ficam até {TRASH_DAYS} dias na lixeira. Você pode restaurá-los para o extrato.
      </Muted>
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {items.map((x, i) => {
          const date = new Date(x.deletedAt);
          const left = daysLeft({ ...x, deletedAt: date.getTime() }, now);
          const income = x.type === "income";
          const when = invalid.has(i) ? "Data de exclusão desconhecida" :
            `Excluído em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${left} ${left === 1 ? "dia" : "dias"}`;
          return (
            <View
              key={x.id}
              style={[k.row, i < items.length - 1 && k.hairline, { borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 68, gap: 4 }]}
            >
              <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
                <T style={{ fontFamily: "SoraSemi" }}>
                  {x.description || "Sem descrição"}
                </T>
                <Muted>
                  {(x.count > 1 ? `${x.count} parcelas · ` : "") + when}
                </Muted>
              </View>
              <T style={{ fontFamily: "SoraSemi", color: income ? c.green : c.text, fontVariant: ["tabular-nums"] }}>{show(x.amount)}</T>
              <IconButton
                name="rotate-ccw"
                label={`Restaurar ${x.description}`}
                onPress={() => restore(x.id)}
              />
              <IconButton
                name="x"
                label={`Apagar ${x.description} de vez`}
                onPress={() =>
                  confirm("Apagar de vez?", "Este lançamento não poderá mais ser restaurado.", () => perform((s: any) => purgeTrash(s, x.id), "Apagado de vez"), "Apagar")
                }
              />
            </View>
          );
        })}
      </Box>
      <View style={{ marginTop: 16 }}>
        <Button
          danger
          secondary
          icon="trash-2"
          title="Esvaziar lixeira"
          onPress={() =>
            confirm(
              plan.message,
              plan.transactions === 1 ? "Um lançamento será apagado de vez." : `${plan.transactions} lançamentos serão apagados de vez.`,
              () => perform((s: any) => emptyTrash(s), "Lixeira esvaziada"),
              "Esvaziar",
            )
          }
        />
      </View>
    </>
  );
}
