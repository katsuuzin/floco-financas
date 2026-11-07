// S2–S6, L14 e H4: personalização, preferências do extrato e boas-vindas.
import React, { useState } from "react";
import { View, Image, Pressable } from "react-native";
import { T, Muted, Box, Section, Button, Toggle, Chips, IconButton, Choice, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { layoutOf, moveBlock, DESTINATIONS } from "../layout.mjs";
import { demoState } from "../finance.mjs";

function BlockList({ which }: { which: "home" | "analysis" }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const list = layoutOf(state)[which];
  const save = (next: any[]) =>
    perform(
      (s: any) => ({
        ...s,
        settings: { ...s.settings, layout: { ...(s.settings.layout || {}), [which]: next.map(({ id, visible }: any) => ({ id, visible })) } },
      }),
      "Layout salvo",
    );
  return (
    <Box style={{ paddingVertical: 4 }}>
      {list.map((b: any, i: number) => (
        <View key={b.id} style={[k.row, k.hairline, { borderBottomColor: c.line, minHeight: 56 }]}>
          <IconButton name={b.visible ? "eye" : "eye-off"} label={`${b.visible ? "Esconder" : "Mostrar"} ${b.label}`} onPress={() => save(list.map((x: any) => (x.id === b.id ? { ...x, visible: !x.visible } : x)))} />
          <T style={{ flex: 1, opacity: b.visible ? 1 : 0.5 }}>{b.label}</T>
          <IconButton name="arrow-up" label={`Subir ${b.label}`} onPress={() => i > 0 && save(moveBlock(list, b.id, -1))} />
          <IconButton name="arrow-down" label={`Descer ${b.label}`} onPress={() => i < list.length - 1 && save(moveBlock(list, b.id, 1))} />
        </View>
      ))}
    </Box>
  );
}

export function LayoutScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [tab, setTab] = useState<"home" | "shortcuts" | "analysis" | "bar">("home");
  const l = layoutOf(state);
  const setLayout = (patch: any) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, layout: { ...(s.settings.layout || {}), ...patch } } }), "Layout salvo");
  return (
    <>
      <Chips
        values={[
          ["home", "Início"],
          ["shortcuts", "Atalhos"],
          ["analysis", "Análise"],
          ["bar", "Barra"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "home" && (
        <>
          <Muted>Use as setas para ordenar os blocos da Início e o olho para mostrar ou esconder. A navegação do mês e o saldo ficam sempre no topo.</Muted>
          <BlockList which="home" />
        </>
      )}
      {tab === "analysis" && (
        <>
          <Muted>Ordene e escolha os blocos da aba Análise. O navegador de mês fica sempre no topo.</Muted>
          <BlockList which="analysis" />
        </>
      )}
      {tab === "shortcuts" && (
        <>
          <Muted>Escolha até 8 atalhos para a Início. A ordem segue a sequência em que você marca.</Muted>
          <View style={k.chips}>
            {DESTINATIONS.map(([id, label]: string[]) => {
              const on = l.shortcuts.includes(id);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setLayout({ shortcuts: on ? l.shortcuts.filter((x: string) => x !== id) : [...l.shortcuts, id].slice(0, 8) })}
                  style={[k.chip, { backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line }]}
                >
                  <T style={{ fontSize: 12, color: on ? c.onPrimary : c.text }}>
                    {on ? `${l.shortcuts.indexOf(id) + 1}. ` : ""}
                    {label}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <Button title="Restaurar padrão" secondary onPress={() => setLayout({ shortcuts: undefined })} />
        </>
      )}
      {tab === "bar" && (
        <>
          <Muted>Escolha o que abre no quarto botão da barra inferior. O que sair da barra continua disponível em Mais.</Muted>
          <Choice label="Quarto botão" values={DESTINATIONS.map(([id, label]: string[]) => [id, label] as [string, string])} value={l.tab4} onChange={(v) => setLayout({ tab4: v })} />
        </>
      )}
      <Button title="Restaurar tudo ao padrão" danger onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, layout: undefined } }), "Layout restaurado")} />
    </>
  );
}

export const DEFAULT_DISPLAY = {
  searchNotes: true,
  cardSeparate: false,
  onlyConfirmed: false,
  highlightPending: true,
  showCategory: "category",
  showTags: true,
  showNotes: false,
  showTime: true,
  dailyBalance: false,
  discountReserved: true,
  hapticOnSave: true,
};
export const displayOf = (s: any) => ({ ...DEFAULT_DISPLAY, ...(s.settings?.display || {}) });

export function PreferencesScreen() {
  const { state, perform } = useStore();
  const d = displayOf(state);
  const set = (key: string) => (value: any) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, display: { ...displayOf(s), [key]: value } } }), "Preferência salva");
  return (
    <>
      <Section title="Extrato" />
      <Box>
        <Toggle label="Buscar também nas observações" value={d.searchNotes} onChange={set("searchNotes")} />
        <Toggle label="Compras do cartão separadas" value={d.cardSeparate} onChange={set("cardSeparate")} hint="Mostra as compras do cartão num grupo próprio, no fim de cada dia." />
        <Toggle label="Apenas efetivadas" value={d.onlyConfirmed} onChange={set("onlyConfirmed")} />
        <Toggle label="Pendentes em destaque" value={d.highlightPending} onChange={set("highlightPending")} />
        <Toggle label="Saldo acumulado por dia" value={d.dailyBalance} onChange={set("dailyBalance")} hint="No cabeçalho de cada dia, mostra o saldo das contas ao fim do dia em vez do resultado do dia." />
      </Box>
      <Section title="Nas transações" />
      <Box>
        <Chips
          values={[
            ["category", "Categoria"],
            ["none", "Sem categoria"],
          ]}
          value={d.showCategory}
          onChange={set("showCategory")}
        />
        <Toggle label="Mostrar tags" value={d.showTags} onChange={set("showTags")} />
        <Toggle label="Mostrar observação" value={d.showNotes} onChange={set("showNotes")} />
        <Toggle label="Mostrar horário" value={d.showTime} onChange={set("showTime")} />
      </Box>
      <Section title="Saldo" />
      <Box>
        <Toggle label="Mostrar disponível descontando caixinhas" value={d.discountReserved} onChange={set("discountReserved")} />
      </Box>
      <Muted>Estas preferências valem sempre; limpar uma busca não as desliga. Idioma: português (BR) · moeda: real · datas: dd/mm/aaaa.</Muted>
    </>
  );
}

export function WelcomeScreen() {
  const { c } = useTheme();
  const { perform } = useStore();
  const nav = useNav();
  const done = (then?: () => void) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, onboarded: true } }), "Bem-vindo ao Floco").then(() => {
      nav.reset();
      then?.();
    });
  return (
    <View style={{ alignItems: "center", gap: 18, paddingTop: 24 }}>
      <Image source={require("../../assets/icon.png")} accessibilityLabel="Mascote Floco" style={{ width: 120, height: 120, borderRadius: 30 }} />
      <T style={[k.pageTitle, { textAlign: "center" }]}>Suas finanças, sem complicar</T>
      <Muted style={{ textAlign: "center" }}>
        Contas, cartões, faturas, metas, orçamentos, contratos e relatórios — tudo livre, sem assinatura, com os dados guardados só neste aparelho.
      </Muted>
      <View style={{ alignSelf: "stretch", gap: 10 }}>
        <Button title="Criar minha primeira conta" icon="plus" onPress={() => done(() => nav.push({ name: "form", kind: "account" }))} />
        <Button title="Explorar com dados fictícios" secondary onPress={() => perform(demoState(), "Demonstração carregada · valores fictícios").then(() => done())} />
        <Button title="Restaurar um backup" secondary onPress={() => done(() => nav.push({ name: "settings" }))} />
      </View>
      <View style={[k.row, { gap: 8 }]}>
        <Muted style={{ fontSize: 11, color: c.muted }}>Sem cadastro, sem anúncios, sem conexão com o banco.</Muted>
      </View>
    </View>
  );
}
