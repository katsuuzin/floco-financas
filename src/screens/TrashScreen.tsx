import React, { useState } from "react";
import { FlatList, View } from "react-native";
import { Box, Button, Empty, Muted, T, styles as k } from "../ui/kit";
import { ConfirmSheet, RowActions } from "../ui/Sheet";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { daysLeft, emptyTrash, purgeTrash, TRASH_DAYS } from "../trash.mjs";
import { emptyTrashPlan, planPurge, restoreFromTrash } from "../trashPurge.mjs";

// S11: lançamentos excluídos, com restaurar, apagar de vez e esvaziar.
export default function TrashScreen({ storageError }: { storageError: string }) {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const [purging, setPurging] = useState("");
  const items: any[] = state.trash || [];
  const now = Date.now();
  const invalid = new Set(planPurge(items, { now } as Parameters<typeof planPurge>[1]).reasons.flatMap((reason) => reason.code === "data_invalida" && "index" in reason ? [reason.index] : []));
  const plan = emptyTrashPlan(items);
  const restore = (id: string) => void perform((s: any) => {
    const next = restoreFromTrash(s, id);
    if (next.error) throw Error(next.error);
    return next;
  }, "Lançamento restaurado");
  return (
    <>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={[k.content, { maxWidth: 900, width: "100%", alignSelf: "center" }]}
        data={items}
        keyExtractor={(item) => item.id}
        initialNumToRender={16}
        maxToRenderPerBatch={16}
        windowSize={7}
        ListHeaderComponent={<>
          {!!storageError && <Box><T style={{ color: c.red }}>{storageError}</T></Box>}
          {!!items.length && <Muted style={{ marginBottom: 10 }}>
            Itens ficam até {TRASH_DAYS} dias na lixeira. Você pode restaurá-los para o extrato.
          </Muted>}
        </>}
        ListEmptyComponent={<Empty title="Lixeira vazia" body={`Lançamentos excluídos ficam aqui por ${TRASH_DAYS} dias e podem ser restaurados.`} />}
        renderItem={({ item: x, index: i }) => {
          const date = new Date(x.deletedAt);
          const left = daysLeft({ ...x, deletedAt: date.getTime() }, now);
          const income = x.type === "income";
          const when = invalid.has(i) ? "Data de exclusão desconhecida" :
            `Excluído em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · Apaga em ${left} ${left === 1 ? "dia" : "dias"}`;
          return (
            <View
              key={x.id}
              style={[k.row, i < items.length - 1 && k.hairline, { backgroundColor: c.surface, borderTopLeftRadius: i === 0 ? 22 : 0, borderTopRightRadius: i === 0 ? 22 : 0,
                borderBottomLeftRadius: i === items.length - 1 ? 22 : 0, borderBottomRightRadius: i === items.length - 1 ? 22 : 0,
                borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 68, gap: 4 }]}
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
              <RowActions title={x.description || "Lançamento"} actions={[
                { icon: "rotate-ccw", label: "Restaurar", onPress: () => restore(x.id) },
                { icon: "trash-2", label: "Apagar de vez", danger: true, onPress: () => setPurging(x.id) },
              ]} />
            </View>
          );
        }}
        ListFooterComponent={items.length ? <View style={{ marginTop: 16 }}>
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
        </View> : undefined}
      />
      {!!purging && <ConfirmSheet title="Apagar de vez?" changes={["O lançamento será removido da lixeira permanentemente."]}
        keeps={[]} action="Apagar de vez" onClose={() => setPurging("")} onConfirm={() => {
          const id = purging;
          setPurging("");
          void perform((s: any) => purgeTrash(s, id), "Apagado de vez");
        }} />}
    </>
  );
}
