import React, { useEffect } from "react";
import { View } from "react-native";
import { Box, Button, Empty, IconButton, Muted, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { daysLeft, emptyTrash, purgeExpired, purgeTrash, restoreTrash, TRASH_DAYS } from "../trash.mjs";

// S11: lançamentos excluídos, com restaurar, apagar de vez e esvaziar.
export default function TrashScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const items: any[] = state.trash || [];
  // Itens com mais de 30 dias saem ao abrir a tela (e também a cada nova exclusão).
  useEffect(() => {
    if (purgeExpired(state) !== state) void perform((s: any) => purgeExpired(s));
  }, []);
  if (!items.length)
    return <Empty title="Lixeira vazia" body={`Lançamentos excluídos ficam aqui por ${TRASH_DAYS} dias e podem ser restaurados.`} />;
  return (
    <>
      <Muted style={{ marginBottom: 10 }}>
        Restaure um lançamento para devolvê-lo ao extrato e ao saldo. Depois de {TRASH_DAYS} dias ele é apagado de vez.
      </Muted>
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {items.map((x, i) => {
          const left = daysLeft(x);
          const income = x.type === "income";
          const when = new Date(x.deletedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
          return (
            <View
              key={x.id}
              style={[k.row, i < items.length - 1 && k.hairline, { borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 68, gap: 4 }]}
            >
              <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
                <T numberOfLines={1} style={{ fontFamily: "SoraSemi" }}>
                  {x.description || "Sem descrição"}
                </T>
                <Muted numberOfLines={2}>
                  {(x.count > 1 ? `${x.count} parcelas · ` : "") + `excluído em ${when} · ${left} ${left === 1 ? "dia" : "dias"}`}
                </Muted>
              </View>
              <T style={{ fontFamily: "SoraSemi", color: income ? c.green : c.text, fontVariant: ["tabular-nums"] }}>{show(x.amount)}</T>
              <IconButton
                name="rotate-ccw"
                label={`Restaurar ${x.description}`}
                onPress={() => void perform((s: any) => restoreTrash(s, x.id), "Lançamento restaurado")}
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
              "Esvaziar lixeira?",
              `${items.length} ${items.length === 1 ? "item será apagado" : "itens serão apagados"} de vez. Isso não pode ser desfeito.`,
              () => perform((s: any) => emptyTrash(s), "Lixeira esvaziada"),
              "Esvaziar",
            )
          }
        />
      </View>
    </>
  );
}
