// Uso dos botões: contagem local de aberturas de tela. Fica só neste aparelho, fora do backup e sem rede.
import React, { useEffect, useState } from "react";
import { Share, View } from "react-native";
import { Box, Button, Muted, T, Toggle, space } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { clearUsage, getUsage, setUsageEnabled, subscribeUsage } from "../usageTracker";
import { emptyUsage, rankedUsage, usageReport } from "../usage.mjs";
import { brDate } from "../dates.mjs";

export default function UsageScreen() {
  const { confirm } = useStore();
  const { c } = useTheme();
  const [usage, setUsage] = useState(emptyUsage());
  useEffect(() => {
    const read = () => getUsage().then((u) => setUsage({ ...u }));
    read();
    return subscribeUsage(read);
  }, []);
  const rows = rankedUsage(usage);
  const total = rows.reduce((n, r) => n + r.count, 0);
  const top = rows[0]?.count || 1;
  return (
    <View style={{ gap: space.md }}>
      <Box style={{ gap: 6 }}>
        <T style={{ fontFamily: "SoraSemi" }}>Quantas vezes você abriu cada tela</T>
        <Muted>
          A contagem fica só neste aparelho. Não vai para a internet, não entra no backup e não guarda valores nem nomes, só o nome da tela. Serve para decidir quais botões esconder.
        </Muted>
      </Box>
      <Toggle label="Contar aberturas" value={usage.enabled} onChange={(v: boolean) => setUsageEnabled(v)} />
      <Muted>{`Desde ${brDate(usage.since)} · ${total} ${total === 1 ? "abertura" : "aberturas"}`}</Muted>
      {rows.length === 0 ? (
        <Muted>Nada contado ainda. Use o app e volte aqui.</Muted>
      ) : (
        <Box style={{ gap: 12 }}>
          {rows.map((r) => (
            <View key={r.key} accessible accessibilityLabel={`${r.label}: ${r.count}`} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <T style={{ flexShrink: 1 }}>{r.label}</T>
                <T style={{ fontFamily: "SoraSemi" }}>{String(r.count)}</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface }}>
                <View style={{ height: 6, borderRadius: 3, width: `${Math.max(4, (r.count / top) * 100)}%`, backgroundColor: c.primary }} />
              </View>
            </View>
          ))}
        </Box>
      )}
      <Button title="Compartilhar contagem" secondary disabled={!rows.length} onPress={() => Share.share({ message: usageReport(usage) }).catch(() => {})} />
      <Button
        title="Zerar contagem"
        secondary
        disabled={!rows.length}
        onPress={() => confirm("Zerar a contagem?", "Os números voltam a zero. Isso não mexe nos seus dados financeiros.", () => clearUsage(), "Zerar")}
      />
    </View>
  );
}
