import React from "react";
import { visibleAccounts } from "../accountOrder.mjs";
import { View, Pressable } from "react-native";
import { T, Muted, I, Box, Group, Row, Section, Button, Empty, IconButton, Progress, fitAmount, styles as k } from "../ui/kit";
import { RowActions, SheetModal } from "../ui/Sheet";
import MotionPressable from "../ui/motion";
import { entityColors, useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav, destination } from "../app/nav";
import { useBankInbox } from "../app/inbox";
import InboxSheet from "./InboxSheet";
import BankBadge from "../ui/BankBadge";
import { bankLook } from "../bankCatalog.mjs";
import { suggestNotification } from "../notification-import.mjs";
import { layoutOf, firstSteps, DESTINATIONS } from "../layout.mjs";
import { overdueItems, overdueLabel } from "../reminders.mjs";
import { monthInsights } from "../insights.mjs";
import { normalizeBudget, budgetUsage } from "../analysis.mjs";
import { receivableBalance } from "../planning.mjs";
import { shoppingSummary } from "../shopping.mjs";
import RestockList from "./RestockList";
import { restockCandidates } from "../shoppingRhythm.mjs";
import { installmentPlan, recurrenceTotals } from "../commitments.mjs";
import {
  totals,
  totalBalance,
  invoice,
  monthKey,
  today,
  addMonths,
  signedAmount,
  invoiceDueDate,
  demoState,
  balance,
  reserved,
  accountBalanceHidden,
} from "../finance.mjs";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";

export function AccountList({ limit, onArchive }: { limit?: number; onArchive?: (id: string) => void }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const nav = useNav();
  const accounts = visibleAccounts(state);
  const [detailId, setDetailId] = React.useState("");
  const detail = accounts.find((account: any) => account.id === detailId);
  const edit = (account: any) => nav.push({
    name: "form", kind: "account",
    initial: { ...account, initial: (account.initial / 100).toFixed(2).replace(".", ",") },
  });
  if (!accounts.length)
    return (
      <Empty
        icon="briefcase"
        title="Seu dinheiro, no seu controle"
        body="Cadastre uma conta ou carteira para começar. Nenhuma conexão com o banco é necessária."
        action={onArchive ? undefined : "Adicionar conta"}
        onPress={() => nav.push({ name: "form", kind: "account" })}
      />
    );
  return (
    <>
    <Box style={{ paddingVertical: 0 }}>
      {accounts.slice(0, limit).map((a: any) => {
        const hidden = accountBalanceHidden(state, a.id);
        const entity = entityColors(a.color, c);
        const toggleBalance = () => void perform((s: any) => ({
          ...s,
          accounts: s.accounts.map((x: any) => x.id === a.id ? { ...x, hideBalance: !a.hideBalance } : x),
        }), a.hideBalance ? "Saldo visível" : "Saldo oculto", {
          undoable: true,
          undo: (s) => ({ ...s, accounts: s.accounts.map((x: any) => x.id === a.id ? { ...x, hideBalance: !!a.hideBalance } : x) }),
        });
        return (
          <View key={a.id} style={[k.row, k.hairline, { borderBottomColor: c.line, minHeight: 80, paddingVertical: 12 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={onArchive ? a.name : `Editar ${a.name}`}
              onPress={() => onArchive ? setDetailId(a.id) : edit(a)}
              style={({ pressed }) => [k.row, { flex: 1, opacity: pressed ? 0.75 : 1 }]}
            >
              {bankLook(a.institution, a.name).known ? (
                <BankBadge name={a.institution} alt={a.name} size={42} />
              ) : (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: entity.backgroundColor,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <I name="briefcase" color={entity.color} />
                </View>
              )}
              {(() => {
                // Com o botão de arquivar na linha (tela Contas) sobra pouca largura: o saldo desce para baixo do nome,
                // em vez de espremer o nome até quebrar no meio da palavra.
                const stacked = !!onArchive;
                const balanceBlock = (
                  <View style={{ alignItems: stacked ? "flex-start" : "flex-end", gap: 2, marginTop: stacked ? 4 : 0 }}>
                    <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Saldo {show(balance(state, a.id), hidden)}</T>
                    {reserved(state, a.id) > 0 && (
                      <Muted style={{ fontSize: 12 }}>
                        Disponível {show(balance(state, a.id) - reserved(state, a.id), hidden)}
                      </Muted>
                    )}
                  </View>
                );
                return (
                  <>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T style={{ fontFamily: "SoraSemi", fontSize: 13 }}>{a.name}</T>
                      <Muted style={{ fontSize: 12 }}>
                        {a.institution || "Carteira"}
                        {a.includeInTotal === false ? " · fora do saldo geral" : ""}
                      </Muted>
                      {stacked && balanceBlock}
                    </View>
                    {!stacked && balanceBlock}
                  </>
                );
              })()}
            </Pressable>
            {onArchive ? (
              <RowActions title={a.name} actions={[
                { icon: a.hideBalance ? "eye" : "eye-off", label: a.hideBalance ? "Mostrar saldo" : "Ocultar saldo", onPress: toggleBalance },
                { icon: "archive", label: "Arquivar conta", onPress: () => onArchive(a.id) },
              ]} />
            ) : (
              <IconButton name={a.hideBalance ? "eye-off" : "eye"} label={`${a.hideBalance ? "Mostrar" : "Ocultar"} saldo de ${a.name}`} onPress={toggleBalance} />
            )}
          </View>
        );
      })}
    </Box>
    {detail && <SheetModal title={detail.name} onClose={() => setDetailId("")}>
      <View style={{ padding: 16, gap: 12 }}>
        <Muted>{detail.institution || "Carteira"}</Muted>
        <T {...fitAmount}>Saldo {show(balance(state, detail.id), accountBalanceHidden(state, detail.id))}</T>
        {reserved(state, detail.id) > 0 && <T {...fitAmount}>
          Disponível {show(balance(state, detail.id) - reserved(state, detail.id), accountBalanceHidden(state, detail.id))}
        </T>}
        <Button title="Editar conta" icon="edit-2" onPress={() => { setDetailId(""); edit(detail); }} />
      </View>
    </SheetModal>}
    </>
  );
}

function Shortcuts() {
  const { c } = useTheme();
  const { state } = useStore();
  const nav = useNav();
  const ids: string[] = layoutOf(state).shortcuts;
  return (
    <View style={[k.chips, { marginTop: 8, marginBottom: 8 }]}>
      {ids.map((id) => {
        const d = DESTINATIONS.find(([x]) => x === id);
        if (!d) return null;
        return (
          <MotionPressable
            key={id}
            kind="chip"
            accessibilityRole="button"
            accessibilityLabel={d[1]}
            onPress={() => {
              const to = destination(id);
              if (to.tab) nav.setTab(to.tab);
              else if (to.route) nav.push(to.route);
            }}
            style={{
              flexGrow: 1,
              flexBasis: "22%",
              minHeight: 72,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: c.surface,
            }}
          >
            <I name={d[2] as any} color={c.primary} />
            <T style={{ fontSize: 12, textAlign: "center" }}>{d[1]}</T>
          </MotionPressable>
        );
      })}
    </View>
  );
}

function FirstSteps() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const nav = useNav();
  const f = firstSteps(state);
  if (f.hidden || f.done === f.steps.length) return null;
  const go: Record<string, () => void> = {
    account: () => nav.push({ name: "form", kind: "account" }),
    expense: () => nav.push({ name: "form", kind: "transaction", initial: { type: "expense" } }),
    card: () => nav.push({ name: "form", kind: "card" }),
    reminders: () => nav.push({ name: "reminders" }),
  };
  return (
    <>
      <Section title="Vamos começar" actionLabel="Ocultar primeiros passos" action="Ocultar" onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, firstStepsHidden: true } }), "Primeiros passos ocultos. Reabra em Configurações › Manutenção.")} />
      <Box style={homeBox}>
        <Muted>
          {f.done} de {f.steps.length} concluídos
        </Muted>
        <View style={{ marginVertical: 10 }}>
          <Progress value={f.done} max={f.steps.length} />
        </View>
        {f.steps.filter((step: any) => !step.done).map((step: any) => (
          <MotionPressable
            key={step.id}
            kind="row"
            accessibilityRole="button"
            accessibilityState={{ checked: step.done }}
            disabled={step.done}
            onPress={go[step.id]}
            style={[k.row, { minHeight: 48, paddingVertical: 6 }]}
          >
            <I name={step.done ? "check-circle" : "circle"} color={step.done ? c.green : c.muted} />
            <T style={{ flex: 1, textDecorationLine: step.done ? "line-through" : "none", opacity: step.done ? 0.6 : 1 }}>{step.label}</T>
            {!step.done && <I name="chevron-right" size={18} />}
          </MotionPressable>
        ))}
        {!state.cards.length && !state.settings.noCard && (
          <Button title="Não uso cartão de crédito" secondary onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, noCard: true } }), "Anotado")} />
        )}
      </Box>
    </>
  );
}

// Lista de pendentes minimalista: seta para entrada/saída e cartão nas compras; o banco vai no texto.
const INBOX_ICON: Record<string, any> = {
  card: "credit-card",
  debit: "credit-card",
  pixIn: "arrow-down",
  transferIn: "arrow-down",
  income: "arrow-down",
  pixOut: "arrow-up",
  transferOut: "arrow-up",
  expense: "arrow-up",
  bill: "file-text",
  yield: "trending-up",
  denied: "slash",
};

// "SMS · NUBANK" → "Nubank" (o rótulo curto deixa mais espaço ao nome da compra).
const bankName = (b: string) => String(b).replace(/^SMS · /, "").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

const homeBox = { padding: 16 } as const; // recuo único de 16 dp nos cartões da Início
const bankSetupLink = { minHeight: 48, justifyContent: "center", paddingHorizontal: 0, minWidth: 48 } as const;

function PendingInbox() {
  const { c } = useTheme();
  const { state, perform, softFail } = useStore();
  const nav = useNav();
  const inbox = useBankInbox(state);
  const [help, setHelp] = React.useState(false);
  const [open, setOpen] = React.useState<any>(null);
  const [showDuplicates, setShowDuplicates] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [enabling, setEnabling] = React.useState(false);
  const viewingDuplicates = showDuplicates && inbox.hiddenRows.length > 0;
  const displayed = viewingDuplicates ? inbox.hiddenRows : inbox.rows;
  const st = inbox.status;
  const working = st?.available && st.permission && st.enabled;
  if (!st) return null;
  if (!working) {
    if (state.settings.bankSetupHiddenUntil > Date.now()) return null;
    const openSettings = () => {
      void inbox.native.openSettings().catch(() => softFail("Não foi possível abrir o acesso às notificações."));
    };
    const enable = () => {
      if (enabling) return;
      setEnabling(true);
      void inbox.native.setEnabled(true).then(inbox.refresh).catch(() => softFail("Não foi possível ligar a leitura das notificações.")).finally(() => setEnabling(false));
    };
    return (
      <Box style={{ gap: 6, marginTop: 8, padding: 16, paddingBottom: 8 }}>
        <T accessibilityRole="header" style={{ fontFamily: "SoraSemi" }}>Leitura automática</T>
        <Muted>{st.available ? "Revise as compras e Pix detectados pelo Floco." : "Atualize o Floco para ler notificações."}</Muted>
        {st.available && (
          <Button
            title={enabling ? "Ligando…" : "Ligar leitura das notificações"}
            disabled={enabling}
            accessibilityLiveRegion="polite"
            onPress={st.permission ? enable : openSettings}
          />
        )}
        <View style={[k.row, { flexWrap: "wrap", justifyContent: "space-between", marginHorizontal: -8 }]}>
          {st.available && !st.permission && (
            <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel="Como ligar a leitura das notificações" onPress={() => setHelp(true)} style={bankSetupLink}>
              <T style={{ color: c.primary }}>Como ligar</T>
            </MotionPressable>
          )}
          <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel="Ocultar aviso por 7 dias" onPress={() => {
            const previous = state.settings.bankSetupHiddenUntil;
            void perform((s: any) => ({
              ...s,
              settings: { ...s.settings, bankSetupHiddenUntil: Date.now() + 7 * 86_400_000 },
            }), "Aviso oculto por 7 dias. Reative em Mais › Notificações", {
              undoable: true,
              undo: (s: any) => ({ ...s, settings: { ...s.settings, bankSetupHiddenUntil: previous } }),
            });
          }} style={bankSetupLink}>
            <T style={{ color: c.muted }}>Agora não</T>
          </MotionPressable>
        </View>
        {help && (
          <SheetModal title="Como ligar" onClose={() => setHelp(false)}>
            <View style={{ gap: 12, padding: 16 }}>
              <T>1. Toque em “Ligar leitura das notificações” e ative o Floco Finanças.</T>
              <T>2. Se o Android bloquear a opção, abra as informações do app, toque em Mais opções e escolha “Permitir configurações restritas”. Depois, repita o primeiro passo.</T>
              {!!inbox.native.openAppInfo && (
                <Button title="Abrir informações do app" secondary onPress={() => {
                  void inbox.native.openAppInfo().catch(() => softFail("Não foi possível abrir as informações do app."));
                }} />
              )}
            </View>
          </SheetModal>
        )}
      </Box>
    );
  }
  return (
    <>
      <Section title={`Pendentes (${inbox.rows.length})`} actionLabel="Ajustes dos pendentes" action="Ajustes" onPress={() => nav.push({ name: "notifications" })} />
      {inbox.hiddenRows.length > 0 && (
        <View style={[k.row, { justifyContent: "space-between" }]}>
          <T accessibilityLiveRegion="polite" style={{ flex: 1 }}>{inbox.hiddenRows.length} {inbox.hiddenRows.length === 1 ? "duplicada ignorada" : "duplicadas ignoradas"}</T>
          <MotionPressable kind="row" accessibilityRole="button" onPress={() => setShowDuplicates(!viewingDuplicates)} style={bankSetupLink}>
            <T style={{ color: c.primary }}>{viewingDuplicates ? "Ver pendentes" : "Ver duplicadas"}</T>
          </MotionPressable>
        </View>
      )}
      {displayed.length ? (
        <>
        <Box style={{ padding: 0, overflow: "hidden", marginBottom: !viewingDuplicates && displayed.length > 12 ? 0 : undefined }}>
          {(viewingDuplicates || showAll ? displayed : displayed.slice(0, 12)).map((row: any, i: number, all: any[]) => {
            const sug = suggestNotification(row);
            const income = sug.type === "income";
            const tone = income ? c.green : c.red;
            const amountLabel = sug.amount ? state.settings.hide ? "R$ ••••" : `R$ ${sug.amount}` : "sem valor";
            return (
              <View key={row.id} style={[k.row, i < all.length - 1 && k.hairline, { borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 72 }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${sug.kindLabel}: ${sug.description}, ${amountLabel}. Revisar e confirmar`}
                  onPress={() => setOpen(row)}
                  android_ripple={{ color: c.soft }}
                  style={[k.row, { flex: 1, paddingVertical: 10 }]}
                >
                  <View importantForAccessibility="no" style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: String(tone).length === 7 ? tone + "26" : c.soft }}>
                    <I name={INBOX_ICON[sug.kind] || (income ? "arrow-down" : "arrow-up")} size={19} color={tone} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>
                      {sug.description}
                    </T>
                    <Muted>
                      {sug.kindLabel} · {bankName(row.bank)}
                    </Muted>
                    {inbox.possibleDuplicates.has(row.id) && <Muted>Possível duplicata — confira antes de registrar</Muted>}
                  </View>
                  <T style={{ fontFamily: "SoraSemi", color: tone, fontVariant: ["tabular-nums"] }}>{sug.amount ? amountLabel : "—"}</T>
                </Pressable>
                <IconButton name="x" label={`Descartar ${sug.description}`} onPress={() => void inbox.dismiss(row.id).catch(() => softFail("Não foi possível descartar a notificação."))} />
              </View>
            );
          })}
        </Box>
        {!viewingDuplicates && displayed.length > 12 && (
          <MotionPressable kind="row" accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={[bankSetupLink, { alignSelf: "center", marginBottom: 12 }]}>
            <T style={{ color: c.primary }}>{showAll ? "Ver menos" : `Ver mais ${displayed.length - 12}`}</T>
          </MotionPressable>
        )}
        </>
      ) : (
        <Box style={homeBox}>
          <Muted>
            Nenhuma notificação pendente.
            {st.lastSeen?.time
              ? ` Última vista: ${st.lastSeen.bank} às ${new Date(st.lastSeen.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${st.lastSeen.reason}).`
              : " Assim que o banco avisar uma compra ou Pix, ela aparece aqui."}
          </Muted>
        </Box>
      )}
      <InboxSheet
        row={open}
        onClose={() => setOpen(null)}
        onDone={(id) => {
          setOpen(null);
          void inbox.dismiss(id).catch(() => softFail("Não foi possível retirar a notificação da fila."));
        }}
      />
    </>
  );
}

// Contas com saldo atual e previsto (inclui pendências do mês) e total.
function AccountsSummary() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const nav = useNav();
  const month = nav.month;
  const accounts = visibleAccounts(state);
  if (!accounts.length) return <AccountList />;
  const forecast = (id: string) =>
    balance(state, id) +
    state.transactions
      .filter((t: any) => !t.confirmed && !t.cardId && monthKey(t.date) <= month && (t.accountId === id || t.destinationId === id))
      .reduce((n: number, t: any) => n + (t.accountId === id ? signedAmount(t) + (t.paidPart || 0) : 0) + (t.type === "transfer" && t.destinationId === id ? t.amount : 0), 0);
  const included = accounts.filter((a: any) => a.includeInTotal !== false);
  const total = included.reduce((n: number, a: any) => n + balance(state, a.id), 0);
  const totalF = included.reduce((n: number, a: any) => n + forecast(a.id), 0);
  const money2 = (n: number, hidden = false) => (n < 0 ? "−" : "") + show(Math.abs(n), hidden);
  return (
    <>
      <Section title="Contas" actionLabel="Ver tudo, Contas" action="Ver tudo" onPress={() => nav.push({ name: "accounts" })} />
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {accounts.map((a: any) => {
          const hidden = accountBalanceHidden(state, a.id);
          const entity = entityColors(a.color, c);
          const b = balance(state, a.id),
            f = forecast(a.id);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => nav.push({ name: "form", kind: "account", initial: { ...a, initial: (a.initial / 100).toFixed(2).replace(".", ",") } })}
              android_ripple={{ color: c.soft }}
              style={[k.row, k.hairline, { borderBottomColor: c.line, paddingHorizontal: 16, paddingVertical: 12 }]}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: entity.backgroundColor, alignItems: "center", justifyContent: "center" }}>
                <T style={{ color: entity.color, fontFamily: "SoraBold" }}>{a.name.slice(0, 1).toUpperCase()}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: "SoraSemi" }}>{a.name}</T>
                {a.includeInTotal === false && <Muted>Fora do total</Muted>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T style={{ fontFamily: "SoraSemi", color: b < 0 ? c.red : c.text }}>Saldo {money2(b, hidden)}</T>
                <Muted style={{ color: f < 0 ? c.red : c.muted }}>Previsto {money2(f, hidden)}</Muted>
              </View>
            </Pressable>
          );
        })}
        <View style={[k.row, { paddingHorizontal: 16, paddingVertical: 12 }]}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: "SoraSemi" }}>Total</T>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T style={{ fontFamily: "SoraBold", color: total < 0 ? c.red : c.text }}>Saldo {money2(total)}</T>
            <Muted style={{ color: totalF < 0 ? c.red : c.muted }}>Previsto {money2(totalF)}</Muted>
          </View>
        </View>
      </Box>
    </>
  );
}

// Cartões com a fatura do mês e o total da próxima.
function CardsSummary() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const nav = useNav();
  const month = nav.month;
  const next = monthKey(addMonths(month + "-01", 1));
  const cards = state.cards.filter((x: any) => !x.archived);
  if (!cards.length) return null;
  const totalNow = cards.reduce((n: number, x: any) => n + invoice(state, x.id, month).due, 0);
  const totalNext = cards.reduce((n: number, x: any) => n + invoice(state, x.id, next).due, 0);
  return (
    <>
      <Section title="Cartões" actionLabel="Ver tudo, Cartões" action="Ver tudo" onPress={() => nav.push({ name: "cards" })} />
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {cards.map((x: any) => {
          const bill = invoice(state, x.id, month);
          const entity = entityColors(x.color, c);
          const status = bill.total === 0 ? "Sem fatura aberta" : bill.due === 0 ? "Fatura paga" : `Vence ${invoiceDueDate(x, month).split("-").reverse().join("/").slice(0, 5)}`;
          return (
            <Pressable
              key={x.id}
              accessibilityRole="button"
              onPress={() => nav.push({ name: "cards", cardId: x.id })}
              android_ripple={{ color: c.soft }}
              style={[k.row, k.hairline, { borderBottomColor: c.line, paddingHorizontal: 16, paddingVertical: 12 }]}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: entity.backgroundColor, alignItems: "center", justifyContent: "center" }}>
                <I name="credit-card" size={18} color={entity.color} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: "SoraSemi" }}>{x.name}</T>
                <Muted>{status}</Muted>
              </View>
              <T style={{ fontFamily: "SoraSemi" }}>{show(bill.due)}</T>
            </Pressable>
          );
        })}
        <View style={[k.row, { paddingHorizontal: 16, paddingVertical: 12 }]}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: "SoraSemi" }}>Total</T>
            <Muted>Próxima</Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T style={{ fontFamily: "SoraBold" }}>{show(totalNow)}</T>
            <Muted>{show(totalNext)}</Muted>
          </View>
        </View>
      </Box>
    </>
  );
}

export default function HomeScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const nav = useNav();
  const { month } = nav;
  const summary = totals(state, month);
  const recent = state.transactions
    .filter((t: any) => monthKey(t.date) === month)
    .sort((a: any, b: any) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const bills = state.cards
    .filter((card: any) => !card.archived)
    .reduce((n: number, card: any) => n + invoice(state, card.id, month).due, 0);
  const ref = month === monthKey(today()) ? today() : `${month}-15`;
  const blocks: Record<string, () => React.ReactNode> = {
    inbox: () => <PendingInbox />,
    firstSteps: () => <FirstSteps />,
    shortcuts: () => <Shortcuts />,
    overdue: () => {
      const items = overdueItems(state, today());
      if (!items.length) return null;
      return (
        <>
          <Section title="Atrasadas" fixedHeight />
          <Group flush>
            {items.map((item: any) => (
              <Row key={item.key} icon="alert-circle" danger label={item.label}
                detail={`${overdueLabel(item.days)} · ${show(item.amount)}`}
                onPress={() => {
                  if (item.source === "invoice") {
                    nav.setMonth(item.month);
                    nav.push({ name: "cards", cardId: item.cardId });
                  } else if (item.source === "transaction") {
                    nav.setMonth(monthKey(item.date));
                    nav.setTab("transactions");
                  } else {
                    nav.push({ name: "people", tab: item.source });
                  }
                }}
              />
            ))}
          </Group>
        </>
      );
    },
    pending: () =>
      (summary.pay > 0 || summary.receive > 0 || bills > 0) && (
        <>
          <Section title="Pendências do mês" fixedHeight />
          <Box style={homeBox}>
            <View style={k.row}>
              <View style={k.flex}>
                <Muted>A pagar</Muted>
                <T {...fitAmount} style={{ color: c.red, fontFamily: "SoraSemi", marginTop: 6 }}>{show(summary.pay)}</T>
              </View>
              <View style={k.flex}>
                <Muted>A receber</Muted>
                <T {...fitAmount} style={{ color: c.green, fontFamily: "SoraSemi", marginTop: 6 }}>{show(summary.receive)}</T>
              </View>
              <View style={k.flex}>
                <Muted>Faturas</Muted>
                <T {...fitAmount} style={{ fontFamily: "SoraSemi", marginTop: 6 }}>{show(bills)}</T>
              </View>
            </View>
          </Box>
        </>
      ),
    insights: () => {
      const list = monthInsights(state, month).slice(0, 3);
      return (
        <>
          <Section title="Destaques" actionLabel="Abrir assistente" action="Assistente" onPress={() => nav.push({ name: "assistant" })} />
          <Box style={homeBox}>{list.length ? list.map((i: any, n: number) => <Muted key={n}>• {i.text}</Muted>) : <Muted>Nada fora do comum neste mês.</Muted>}</Box>
        </>
      );
    },
    accounts: () => <AccountsSummary />,
    cards: () => <CardsSummary />,
    budgets: () =>
      state.budgets.length > 0 && (
        <>
          <Section title="Orçamentos" actionLabel="Ver tudo, Orçamentos" action="Ver tudo" onPress={() => nav.push({ name: "budgets" })} />
          <Box style={homeBox}>
            {state.budgets.slice(0, 4).map((raw: any) => {
              const b = normalizeBudget(raw);
              const u = budgetUsage(state, b, ref);
              return (
                <View key={b.id} style={{ marginBottom: 10, gap: 4 }}>
                  <View style={[k.row, { justifyContent: "space-between" }]}>
                    <T style={{ flex: 1, fontSize: 13 }}>{b.name || b.categories.join(", ")}</T>
                    <Muted>
                      {show(u.used)} / {show(u.limit)}
                    </Muted>
                  </View>
                  <Progress value={u.used} max={u.limit} color={b.type === "expense" && u.used > u.limit ? c.red : undefined} />
                </View>
              );
            })}
          </Box>
        </>
      ),
    goals: () =>
      state.goals.length > 0 && (
        <>
          <Section title="Metas" actionLabel="Ver tudo, Metas" action="Ver tudo" onPress={() => nav.push({ name: "goals" })} />
          <Box style={homeBox}>
            {state.goals.slice(0, 4).map((g: any) => (
              <View key={g.id} style={{ marginBottom: 10, gap: 4 }}>
                <View style={[k.row, { justifyContent: "space-between" }]}>
                  <T style={{ flex: 1, fontSize: 13 }}>{g.name}</T>
                  <Muted>
                    {show(g.saved)} / {show(g.target)}
                  </Muted>
                </View>
                <Progress value={g.saved} max={g.target} />
              </View>
            ))}
          </Box>
        </>
      ),
    receivables: () => {
      const open = (state.receivables || []).filter((r: any) => receivableBalance(r) > 0);
      return (
        open.length > 0 && (
          <>
            <Section title="Quem me deve" actionLabel="Ver tudo, Quem me deve" action="Ver tudo" onPress={() => nav.push({ name: "people", tab: "receivables" })} />
            <Box style={homeBox}>
              {open.slice(0, 4).map((r: any) => (
                <View key={r.id} style={[k.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                  <T style={{ flex: 1, fontSize: 13 }}>{r.person}</T>
                  <T style={{ color: c.green }}>{show(receivableBalance(r))}</T>
                </View>
              ))}
            </Box>
          </>
        )
      );
    },
    installments: () => {
      const plan = installmentPlan(state, month, 3);
      return (
        plan.remaining > 0 && (
          <>
            <Section title="Parcelamentos" actionLabel="Ver tudo, Parcelamentos" action="Ver tudo" onPress={() => nav.push({ name: "debts", tab: "installments" })} />
            <Box style={homeBox}>
              <Muted>Falta pagar {show(plan.remaining)} em parcelas.</Muted>
              {plan.rows.map((r: any) => (
                <Muted key={r.month}>
                  {r.month.slice(5)}/{r.month.slice(2, 4)}: {show(r.total)}
                </Muted>
              ))}
            </Box>
          </>
        )
      );
    },
    recurrences: () => {
      const t = recurrenceTotals(state);
      return (
        (state.recurrences || []).length > 0 && (
          <>
            <Section title="Recorrências" actionLabel="Ver tudo, Recorrências" action="Ver tudo" onPress={() => nav.push({ name: "recurrences" })} />
            <Box style={homeBox}>
              <Muted>
                Despesas fixas {show(t.expense.month)}/mês · receitas {show(t.income.month)}/mês
              </Muted>
            </Box>
          </>
        )
      );
    },
    restock: () => {
      if (!restockCandidates(state, today(), { limit: 1 }).length) return null;
      return (
        <>
          <Section title="Já deve estar acabando" actionLabel="Histórico de compras" action="Histórico" onPress={() => nav.push({ name: "purchases" })} />
          <View style={{ marginBottom: 12 }}>
            <RestockList limit={3} />
          </View>
        </>
      );
    },
    shopping: () => {
      const sum = shoppingSummary(state);
      // O bloco abre a lista ativa por cima das Listas: voltar leva às Listas e, de novo, à Início.
      const open = () => { nav.push({ name: "shopping" }); nav.push({ name: "shoppingList" }); };
      const title =
        sum.total === 0
          ? "Lista vazia"
          : sum.pending === 0
            ? "Tudo no carrinho"
            : `${sum.pending} ${sum.pending === 1 ? "item pendente" : "itens pendentes"}`;
      const detail =
        sum.total === 0
          ? "Toque para adicionar itens."
          : sum.pending === 0
            ? "Limpe o carrinho depois da compra."
            : sum.estimatedCents === 0
              ? "Sem preços informados"
              : sum.unpriced > 0
                ? `${sum.unpriced} sem preço`
                : undefined;
      const hasEstimate = sum.pending > 0 && sum.estimatedCents > 0;
      const more = sum.pending - sum.preview.length;
      return (
        <>
          <Section title="Lista de compras" actionLabel="Ver tudo, Lista de compras" action="Ver tudo" onPress={open} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lista de compras. ${title}.${hasEstimate ? ` Estimado ${show(sum.estimatedCents)}.` : ""}${detail ? ` ${detail}` : ""}`}
            accessibilityHint="Abre a lista de compras"
            onPress={open}
            android_ripple={{ color: c.soft }}
            style={{ borderRadius: 22, backgroundColor: c.surface, padding: 16, gap: 4, minHeight: 72, marginBottom: 12 }}
          >
            <View style={[k.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: "SoraSemi" }}>{title}</T>
                {!!detail && <Muted>{detail}</Muted>}
              </View>
              {hasEstimate && (
                <View style={{ alignItems: "flex-end" }}>
                  <T style={{ fontFamily: "SoraSemi", fontSize: 17, fontVariant: ["tabular-nums"] }}>{show(sum.estimatedCents)}</T>
                  <Muted>estimado</Muted>
                </View>
              )}
            </View>
            <View style={[k.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
              <View style={{ flex: 1, marginTop: 8, gap: 2 }}>
                {sum.preview.map((i: any) => (
                  <Muted key={i.id} numberOfLines={1}>
                    {"– " + (i.unit ? `${i.qty} ${i.unit} ` : i.qty > 1 ? `${i.qty}x ` : "") + i.name}
                  </Muted>
                ))}
                {more > 0 && <Muted>{`e mais ${more}`}</Muted>}
              </View>
              <IconButton
                name="plus"
                label="Adicionar item à lista de compras"
                color={c.primary}
                onPress={() => { nav.push({ name: "shopping" }); nav.push({ name: "shoppingList", add: true }); }}
              />
            </View>
          </Pressable>
        </>
      );
    },
    recent: () => (
      <>
        <Section title="Despesas recentes" actionLabel="Ver tudo, Despesas recentes" action="Ver tudo" onPress={() => nav.setTab("transactions")} />
        {recent.length ? (
          <Box style={{ padding: 0, overflow: "hidden" }}>
            {recent.slice(0, 5).map((t: any, i: number, all: any[]) => (
              <TransactionRow key={t.id} t={t} withDate last={i === all.length - 1} />
            ))}
          </Box>
        ) : (
          <Box style={homeBox}>
            <Muted>Nenhum lançamento neste mês.</Muted>
          </Box>
        )}
      </>
    ),
  };
  return (
    <>
      <MonthBar />
      <View style={{ borderRadius: 16, padding: 24, marginTop: 4, backgroundColor: c.accent }}>
        <View style={[k.row, { justifyContent: "space-between" }]}>
          <T style={{ color: c.heroText, fontFamily: "SoraSemi" }}>Saldo total</T>
          <View style={{ marginRight: -12 }}>
            <IconButton
              name={state.settings.hide ? "eye-off" : "eye"}
              label={state.settings.hide ? "Valores ocultos. Mostrar" : "Valores visíveis. Ocultar"}
              color={c.heroText}
              onPress={() =>
                perform(
                  (s: any) => ({ ...s, settings: { ...s.settings, hide: !s.settings.hide } }),
                  state.settings.hide ? "Valores visíveis" : "Valores ocultos",
                )
              }
            />
          </View>
        </View>
        <T {...fitAmount} accessibilityLabel={state.settings.hide ? "Saldo total oculto" : undefined} style={[k.balanceValue, { color: c.heroText, marginTop: 0 }]}>{show(totalBalance(state))}</T>
        <T style={{ color: c.heroText, fontSize: 12, marginTop: 4 }}>Saldo atual das contas incluídas</T>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Box style={{ flex: 1, marginBottom: 0 }}>
          <View style={[k.row, { flexWrap: "wrap", gap: 4 }]}>
            <I name="arrow-down-left" color={c.green} />
            <Muted>Receitas</Muted>
          </View>
          <T {...fitAmount} accessibilityLabel={state.settings.hide ? "Receitas ocultas" : undefined} style={{ fontFamily: "SoraSemi", fontSize: 17, color: c.green, marginTop: 8 }}>{show(summary.income)}</T>
        </Box>
        <Box style={{ flex: 1, marginBottom: 0 }}>
          <View style={[k.row, { flexWrap: "wrap", gap: 4 }]}>
            <I name="arrow-up-right" color={c.red} />
            <Muted>Despesas</Muted>
          </View>
          <T {...fitAmount} accessibilityLabel={state.settings.hide ? "Despesas ocultas" : undefined} style={{ fontFamily: "SoraSemi", fontSize: 17, marginTop: 8 }}>{show(summary.expense)}</T>
        </Box>
      </View>
      <View style={{ height: 4 }} />
      {layoutOf(state)
        .home.filter((b: any) => b.visible && blocks[b.id])
        .map((b: any) => (
          <React.Fragment key={b.id}>{blocks[b.id]()}</React.Fragment>
        ))}
      <MotionPressable kind="row" accessibilityRole="button" onPress={() => nav.push({ name: "layout" })} style={[k.row, { justifyContent: "center", minHeight: 48, marginTop: 8 }]}>
        <I name="sliders" size={16} color={c.primary} />
        <T style={{ color: c.primary, fontSize: 13 }}>Personalizar início</T>
      </MotionPressable>
      {!state.accounts.length && (
        <Button
          title="Explorar com dados de demonstração"
          secondary
          onPress={() =>
            confirm(
              "Carregar demonstração?",
              "Estes são valores fictícios. Você poderá apagar a demonstração em Configurações.",
              () => perform(demoState(), "Demonstração carregada · valores fictícios"),
            )
          }
        />
      )}
      <View style={[k.row, { justifyContent: "center", marginVertical: 26, gap: 8 }]}>
        <I name="shield" size={15} />
        <Muted style={{ fontSize: 12 }}>Sem cadastro. Seus registros ficam neste aparelho.</Muted>
      </View>
    </>
  );
}
