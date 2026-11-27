// S2–S6, L14 e H4: personalização, preferências do extrato e boas-vindas.
import React, { useState } from "react";
import { View, Image, Pressable } from "react-native";
import { T, Muted, I, Box, Section, Button, Toggle, Chips, IconButton, Choice, styles as k } from "../ui/kit";
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

// Dados só para ilustrar a apresentação. Nada daqui é gravado.
const SAMPLE_BARS: [string, string, number, string][] = [
  ["Moradia", "R$ 980,00", 0.42, "home"],
  ["Alimentação", "R$ 650,00", 0.28, "shopping-bag"],
  ["Transporte", "R$ 420,00", 0.18, "navigation"],
];
const SAMPLE_ROWS: [string, string, string, boolean][] = [
  ["Supermercado Bom Preço", "Alimentação · hoje", "− R$ 214,30", false],
  ["Salário", "Receita · 05/11", "+ R$ 5.200,00", true],
  ["Posto Ipiranga", "Transporte · 03/11", "− R$ 180,00", false],
];
const FEATURES: [any, string, string][] = [
  ["bell", "Lê as notificações do seu banco", "Compras e Pix viram pendências para você confirmar em um toque."],
  ["file-text", "Nota fiscal em itens", "Leia o QR do cupom e acompanhe o preço de cada produto."],
  ["target", "Orçamentos, metas e faturas", "Planeje o mês, separe caixinhas e veja o que vence."],
];

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
    <View style={{ gap: 22, paddingTop: 4 }}>
      <View style={[k.row, { gap: 12 }]}>
        <Image source={require("../../assets/icon.png")} accessibilityLabel="Mascote Floco" style={{ width: 48, height: 48, borderRadius: 14 }} />
        <T style={{ fontFamily: "SoraBold", fontSize: 18 }}>Floco Finanças</T>
      </View>
      <View style={{ gap: 8 }}>
        <T accessibilityRole="header" style={{ fontFamily: "SoraBold", fontSize: 28, lineHeight: 36 }}>Todo o seu dinheiro em um só lugar</T>
        <Muted style={{ fontSize: 15, lineHeight: 22 }}>Contas, cartões, faturas, metas e orçamentos. Sem assinatura, sem anúncios e sem cadastro.</Muted>
      </View>

      <View
        accessible
        accessibilityLabel="Exemplo com dados fictícios: saldo total R$ 12.480,90, receitas R$ 5.200,00 e despesas R$ 2.318,40 no mês, com gastos por categoria e últimas transações."
        style={{ gap: 12 }}
      >
        <View style={[k.row, { gap: 8 }]}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.soft }}>
            <T style={{ fontSize: 11, fontFamily: "SoraSemi", color: c.muted, letterSpacing: 0.6 }}>EXEMPLO · DADOS FICTÍCIOS</T>
          </View>
        </View>
        <View style={{ backgroundColor: c.accent, borderRadius: 26, padding: 20, gap: 14 }}>
          <T style={{ color: c.heroText, fontFamily: "SoraSemi", fontSize: 14 }}>Saldo total</T>
          <T style={{ color: c.heroText, fontFamily: "SoraBold", fontSize: 36, lineHeight: 44 }} {...{ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7 }}>R$ 12.480,90</T>
          <View style={[k.row, { gap: 10 }]}>
            <View style={{ flex: 1, borderWidth: 1.5, borderColor: c.heroText, borderRadius: 16, padding: 12 }}>
              <T style={{ color: c.heroText, fontSize: 12 }}>Receitas</T>
              <T style={{ color: c.heroText, fontFamily: "SoraBold", fontSize: 15 }}>R$ 5.200,00</T>
            </View>
            <View style={{ flex: 1, borderWidth: 1.5, borderColor: c.heroText, borderRadius: 16, padding: 12 }}>
              <T style={{ color: c.heroText, fontSize: 12 }}>Despesas</T>
              <T style={{ color: c.heroText, fontFamily: "SoraBold", fontSize: 15 }}>R$ 2.318,40</T>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: c.surface, borderRadius: 22, padding: 16, gap: 14, borderWidth: 1, borderColor: c.line }}>
          <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Gastos do mês por categoria</T>
          {SAMPLE_BARS.map(([name, value, ratio, icon]) => (
            <View key={name} style={{ gap: 6 }}>
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <View style={[k.row, { gap: 8 }]}>
                  <I name={icon as any} size={16} color={c.primary} />
                  <T style={{ fontSize: 13 }}>{name}</T>
                </View>
                <T style={{ fontSize: 13, fontFamily: "SoraSemi" }}>{value}</T>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.soft, overflow: "hidden" }}>
                <View style={{ width: `${Math.round(ratio * 100 * 1.8)}%`, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
              </View>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
          {SAMPLE_ROWS.map(([title, sub, value, income], i) => (
            <View key={title} style={[k.row, { gap: 12, padding: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}>
                <I name={income ? "arrow-down-left" : "arrow-up-right"} size={18} color={income ? c.green : c.red} />
              </View>
              <View style={{ flex: 1 }}>
                <T numberOfLines={1} style={{ fontFamily: "SoraSemi", fontSize: 14 }}>{title}</T>
                <Muted style={{ fontSize: 12 }}>{sub}</Muted>
              </View>
              <T style={{ fontFamily: "SoraSemi", fontSize: 14, color: income ? c.green : c.red }}>{value}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 16 }}>
        {FEATURES.map(([icon, title, text]) => (
          <View key={title} style={[k.row, { gap: 14, alignItems: "flex-start" }]}>
            <View importantForAccessibility="no" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}>
              <I name={icon} size={20} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: "SoraSemi", fontSize: 15 }}>{title}</T>
              <Muted style={{ fontSize: 13, lineHeight: 19 }}>{text}</Muted>
            </View>
          </View>
        ))}
      </View>

      <View style={[k.row, { gap: 10, padding: 14, borderRadius: 18, backgroundColor: c.soft, alignItems: "flex-start" }]}>
        <I name="lock" size={18} color={c.primary} />
        <Muted style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>Seus dados ficam só neste aparelho. O Floco não conecta ao banco e não pede senha nem CPF.</Muted>
      </View>

      <View style={{ gap: 10 }}>
        <Button title="Criar minha primeira conta" icon="plus" onPress={() => done(() => nav.push({ name: "form", kind: "account" }))} />
        <Button title="Explorar com dados fictícios" secondary onPress={() => perform(demoState(), "Demonstração carregada · valores fictícios").then(() => done())} />
        <Button title="Restaurar um backup" secondary onPress={() => done(() => nav.push({ name: "dataTools" }))} />
      </View>
    </View>
  );
}
