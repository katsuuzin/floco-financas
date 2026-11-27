// Aba Tipo de gasto da Análise (equivale a "Tipo de Gasto" do Calen): proporção Fixo, Cortável,
// Variável e Guardado, metas por tipo em % da renda, categorias dentro de cada tipo e saldo.
import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, TextInput } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { today } from "../../finance.mjs";
import { categoryNames } from "../../categories.mjs";
import { spendByType, spendTypeConfig, typeOfCategory, SPEND_MODELS, setCategoryType, setTypeGoal, applyModel, clearGoals, addCustomType, removeCustomType } from "../../spendTypes.mjs";
import { lookOf } from "../../looks.mjs";
import CategoryIcon from "../../ui/CategoryIcon";
import { entityColors, useTheme } from "../../ui/theme";
import { SheetModal } from "../../ui/pickers";
import { useCalen, CText, CCard, CPills, CIconButton, CBar, CButton } from "../../ui/calen";
import { useNav } from "../../app/nav";

type Sort = "value" | "name" | "low";
const SORT_LABEL: Record<Sort, string> = { value: "Maior valor", name: "Nome", low: "Menor valor" };

export default function SpendTypeTab() {
  const { k, tint } = useCalen();
  const { state, show, perform } = useStore();
  const { month } = useNav();
  const [unit, setUnit] = useState<"money" | "percent">("money");
  const [byInvoice, setByInvoice] = useState(false);
  const [sort, setSort] = useState<Sort>("value");
  const [open, setOpen] = useState("");
  const [editing, setEditing] = useState(false);
  const [info, setInfo] = useState(false);
  const ref = today();
  const data = useMemo(() => spendByType(state, month, { byInvoice, ref, sort } as any), [state.transactions, state.goals, state.settings?.spendTypes, state.accounts, month, byInvoice, sort]);
  const shown = data.rows.filter((r: any) => r.cents > 0 || r.goalPct !== null || !r.custom);
  const pct = (f: number) => Math.round(f * 100) + "%";
  const nonZero = data.rows.filter((r: any) => r.cents > 0);
  const now = month === today().slice(0, 7);
  const goalLabel = state.settings?.spendTypes?.model ? `Meta ${SPEND_MODELS.find((m) => m.id === state.settings.spendTypes.model)?.name || ""}` : data.goalsSet ? "Metas por tipo" : "Meta - definir";
  const typeIcon = (r: any) => ({ icon: "tag", color: r.color, image: r.icon });
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <CIconButton name="info" label="Como os tipos são calculados" onPress={() => setInfo(!info)} />
      </View>
      {info && (
        <CCard style={{ backgroundColor: tint(k.primary), borderColor: k.primary }}>
          <CText style={{ fontSize: 13 }}>
            Cada categoria entra em um tipo (Fixo, Cortável ou Variável). Um lançamento pode ter um tipo próprio, escolhido na edição dele. Guardado soma o que você depositou em metas e caixinhas no mês. As metas são uma porcentagem da renda do mês.
          </CText>
        </CCard>
      )}
      {data.isEmpty ? (
        <CCard>
          <CText muted>Quando você lançar despesas ou guardar dinheiro em metas, a divisão por tipo aparece aqui.</CText>
        </CCard>
      ) : (
        <>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {nonZero.map((r: any, i: number) => (
              <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {i > 0 && <CText muted>/</CText>}
                <CategoryIcon look={typeIcon(r)} size={30} />
                <CText bold style={{ fontSize: 26, lineHeight: 32 }}>
                  {pct(r.fraction)}
                </CText>
              </View>
            ))}
          </View>
          {nonZero.length > 1 && <View accessible accessibilityLabel={`Divisão do mês: ${nonZero.map((r: any) => `${r.name} ${pct(r.fraction)}`).join(", ")}`} style={{ height: 52, borderRadius: 18, flexDirection: "row", overflow: "hidden", backgroundColor: k.track, gap: 2 }}>
            {nonZero.map((r: any) => (
              <View key={r.id} style={{ flex: r.fraction, backgroundColor: r.color }} />
            ))}
          </View>}
          <View style={{ alignItems: "center", gap: 6 }}>
            <CText>
              {now ? "Gasto até agora: " : "Gasto no mês: "}
              <CText bold>{show(data.spent)}</CText>
            </CText>
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CText muted>{goalLabel}</CText>
              <Feather name="edit-2" size={14} color={k.muted} />
            </Pressable>
          </View>
        </>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: byInvoice }} accessibilityLabel="Por fatura: compras no cartão contam no mês da fatura" onPress={() => setByInvoice(!byInvoice)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: byInvoice ? k.primary : k.soft }}>
          <CText semi={byInvoice} style={{ fontSize: 13, color: byInvoice ? k.onPrimary : k.muted }}>
            Por fatura
          </CText>
        </Pressable>
        <View style={{ width: 120 }}>
          <CPills<"money" | "percent"> small items={[["money", "R$"], ["percent", "%"]]} value={unit} onChange={setUnit} />
        </View>
        <CIconButton name="repeat" label={`Ordem: ${SORT_LABEL[sort]}. Trocar`} onPress={() => setSort(sort === "value" ? "name" : sort === "name" ? "low" : "value")} />
      </View>
      <CCard padded={false}>
        {shown.map((r: any, i: number) => {
          const expanded = open === r.id;
          const over = r.goalCents !== null && !r.saved && r.cents > r.goalCents;
          return (
            <View key={r.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: k.line }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${r.name}, ${show(r.cents)}, ${pct(r.fraction)}`} onPress={() => setOpen(expanded ? "" : r.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <Feather name={expanded ? "chevron-down" : "chevron-right"} size={16} color={k.muted} />
                <CategoryIcon look={typeIcon(r)} size={40} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <CText semi numberOfLines={1} style={{ flex: 1 }}>
                      {r.name}
                    </CText>
                    <CText semi style={{ fontVariant: ["tabular-nums"] }}>
                      {unit === "money" ? show(r.cents) : pct(r.fraction)}
                    </CText>
                  </View>
                  {r.goalCents !== null && (
                    <>
                      <CBar value={r.cents} max={r.goalCents} color={over ? k.danger : r.saved ? k.success : r.color} />
                      <CText muted style={{ fontSize: 12 }}>
                        Meta {r.goalPct}% da renda · {show(r.goalCents)}
                        {over ? ` · ${show(r.cents - r.goalCents)} acima` : ""}
                      </CText>
                    </>
                  )}
                </View>
              </Pressable>
              {expanded && (
                <View style={{ paddingLeft: 82, paddingRight: 14, paddingBottom: 12, gap: 8 }}>
                  {r.categories.length ? (
                    r.categories.map((c: any) => (
                      <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <CategoryIcon look={lookOf(state, c.name)} size={28} />
                        <CText numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
                          {c.name}
                        </CText>
                        <CText muted style={{ fontSize: 13 }}>
                          {show(c.cents)}
                        </CText>
                      </View>
                    ))
                  ) : (
                    <CText muted style={{ fontSize: 13 }}>
                      {r.saved ? "Nada guardado em metas e caixinhas neste mês." : "Nenhum gasto neste tipo no mês."}
                    </CText>
                  )}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: k.line }}>
          <View style={{ width: 16 }} />
          <CategoryIcon look={{ icon: "tag", color: "#64748B", image: "vault" }} size={40} />
          <CText semi style={{ flex: 1 }}>
            Saldo
          </CText>
          <View style={{ alignItems: "flex-end" }}>
            <CText semi color={data.balance < 0 ? k.dangerText : undefined}>
              {data.balance < 0 ? "−" : ""}
              {show(Math.abs(data.balance))}
            </CText>
            {data.forecast !== null && (
              <CText style={{ fontSize: 12, color: data.forecast < 0 ? k.dangerText : k.muted }}>
                Saldo previsto {data.forecast < 0 ? "−" : ""}
                {show(Math.abs(data.forecast))}
              </CText>
            )}
          </View>
        </View>
      </CCard>
      <CButton title="Editar tipos" icon="edit-2" onPress={() => setEditing(true)} />
      {editing && <TypesEditor onClose={() => setEditing(false)} perform={perform} state={state} />}
    </View>
  );
}

function TypesEditor({ state, perform, onClose }: { state: any; perform: any; onClose: () => void }) {
  const { c } = useTheme();
  const { k, tint } = useCalen();
  const cfg: any = spendTypeConfig(state);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [goals, setGoals] = useState<Record<string, string>>(() => Object.fromEntries(cfg.types.map((t: any) => [t.id, cfg.goals[t.id] !== undefined ? String(cfg.goals[t.id]).replace(".", ",") : ""])));
  const run = async (f: (s: any) => any, msg: string) => {
    setError("");
    const ok = await perform(f, msg);
    return ok;
  };
  const sum = Object.values(goals).reduce((a, v) => a + (Number(String(v).replace(",", ".")) || 0), 0);
  const saveGoals = async () => {
    for (const t of cfg.types) {
      const v = goals[t.id];
      const ok = await run((s: any) => setTypeGoal(s, t.id, v === "" ? "" : v), "Metas salvas");
      if (!ok) return;
    }
    onClose();
  };
  return (
    <SheetModal title="Editar tipos" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <CText semi>Modelo de metas</CText>
          <CText muted style={{ fontSize: 12 }}>
            Cada tipo recebe uma porcentagem da renda do mês. A meta é opcional.
          </CText>
          {SPEND_MODELS.map((m) => {
            const on = state.settings?.spendTypes?.model === m.id;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={async () => {
                  const ok = await run((s: any) => applyModel(s, m.id), `Modelo ${m.name} aplicado`);
                  if (ok) onClose();
                }}
                style={{ minHeight: 52, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: on ? k.primary : k.line, backgroundColor: on ? tint(k.primary) : "transparent" }}
              >
                <CText semi>{m.name}</CText>
                <CText muted style={{ fontSize: 12 }}>
                  {m.note}
                </CText>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => run((s: any) => clearGoals(s), "Metas removidas").then((ok: boolean) => ok && onClose())} style={{ minHeight: 44, justifyContent: "center" }}>
            <CText semi color={k.primaryText} style={{ fontSize: 13 }}>
              Tirar todas as metas
            </CText>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          <CText semi>Meta por tipo (% da renda)</CText>
          {cfg.types.map((t: any) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <CategoryIcon look={{ icon: "tag", color: t.color, image: t.icon }} size={34} />
              <CText style={{ flex: 1 }}>{t.name}</CText>
              <TextInput
                accessibilityLabel={`Meta de ${t.name} em porcentagem`}
                value={goals[t.id]}
                onChangeText={(v) => setGoals({ ...goals, [t.id]: v })}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={k.subtle}
                style={{ width: 72, minHeight: 44, textAlign: "right", paddingHorizontal: 10, borderRadius: 12, backgroundColor: k.soft, color: k.text }}
              />
              <CText muted>%</CText>
            </View>
          ))}
          <CText muted style={{ fontSize: 12, color: sum > 100 ? k.dangerText : k.muted }}>
            Soma das metas: {sum.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%{sum > 100 ? " (passa de 100%)" : ""}
          </CText>
          <CButton title="Salvar metas" icon="check" onPress={saveGoals} />
        </View>
        <View style={{ gap: 8 }}>
          <CText semi>Em qual tipo cada categoria entra</CText>
          {categoryNames(state).map((name: string) => (
            <View key={name} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CategoryIcon look={lookOf(state, name)} size={28} />
                <CText style={{ flex: 1, fontSize: 14 }}>{name}</CText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingLeft: 38 }}>
                {cfg.types
                  .filter((t: any) => !t.saved)
                  .map((t: any) => {
                    const on = typeOfCategory(cfg, name) === t.id;
                    return (
                      <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${name} em ${t.name}`} onPress={() => run((s: any) => setCategoryType(s, name, t.id), `${name}: ${t.name}`)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: on ? t.color : k.soft }}>
                        <CText semi={on} style={{ fontSize: 13, color: on ? entityColors(t.color, c).color : k.muted }}>
                          {t.name}
                        </CText>
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          ))}
        </View>
        <View style={{ gap: 8 }}>
          <CText semi>Tipo próprio</CText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput accessibilityLabel="Nome do novo tipo" value={newName} onChangeText={setNewName} placeholder="Ex.: Dívidas" placeholderTextColor={k.subtle} maxLength={30} style={{ flex: 1, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: k.soft, color: k.text }} />
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const ok = await run((s: any) => addCustomType(s, { name: newName } as any), "Tipo criado");
                if (ok) {
                  setNewName("");
                  onClose();
                }
              }}
              style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: k.primary, justifyContent: "center" }}
            >
              <CText semi color={k.onPrimary}>
                Criar
              </CText>
            </Pressable>
          </View>
          {cfg.types
            .filter((t: any) => t.custom)
            .map((t: any) => (
              <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CText style={{ flex: 1 }}>{t.name}</CText>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remover o tipo ${t.name}`} onPress={() => run((s: any) => removeCustomType(s, t.id), "Tipo removido").then((ok: boolean) => ok && onClose())} style={{ minHeight: 44, justifyContent: "center" }}>
                  <CText semi color={k.dangerText} style={{ fontSize: 13 }}>
                    Remover
                  </CText>
                </Pressable>
              </View>
            ))}
        </View>
        {!!error && <CText color={k.dangerText}>{error}</CText>}
      </ScrollView>
    </SheetModal>
  );
}
