// F8 — Assistente: insights e saúde financeira locais; chat, resumo e plano com IA opcional.
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { T, Muted, Box, Section, Button, Field, Choice, Chips, Toggle, Progress, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { monthInsights, healthScore, actionPlan, aiContext } from "../insights.mjs";
import { monthKey, today } from "../finance.mjs";
import { ask, getKey, setKey, PROVIDERS, Provider } from "../app/ai";

export default function AssistantScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [view, setView] = useState<"overview" | "chat" | "setup">("overview");
  const ai = { provider: "gemini" as Provider, model: "", consent: false, ...(state.settings.ai || {}) };
  const [hasKey, setHasKey] = useState(false);
  const [keyText, setKeyText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [narrative, setNarrative] = useState("");
  useEffect(() => {
    getKey().then((k) => setHasKey(!!k)).catch(() => {});
  }, []);
  const h = healthScore(state);
  const insights = monthInsights(state, monthKey(today()));
  const plan = actionPlan(state);
  const history: any[] = state.settings.healthHistory || [];
  const saveAi = (patch: any) => perform((s: any) => ({ ...s, settings: { ...s.settings, ai: { ...ai, ...(s.settings.ai || {}), ...patch } } }), "Assistente atualizado");
  const online = hasKey && ai.consent;
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const recordScore = () =>
    perform(
      (s: any) => {
        const list = (s.settings.healthHistory || []).filter((x: any) => x.month !== h.month);
        return { ...s, settings: { ...s.settings, healthHistory: [...list, { month: h.month, score: h.score, date: today() }].slice(-24) } };
      },
      "Nota registrada no histórico",
    );
  const color = h.score >= 80 ? c.green : h.score >= 60 ? c.primary : h.score >= 40 ? c.amber : c.red;

  return (
    <>
      <Chips
        values={[
          ["overview", "Visão geral"],
          ["chat", "Conversar"],
          ["setup", "Chave de IA"],
        ]}
        value={view}
        onChange={setView}
      />
      {view === "overview" && (
        <>
          <Box>
            <Muted>Saúde financeira</Muted>
            <View style={[k.row, { alignItems: "flex-end" }]}>
              <T style={[k.balanceValue, { color }]}>{h.score}</T>
              <T style={{ marginBottom: 10 }}>/100 · {h.level}</T>
            </View>
            <Progress value={h.score} max={100} color={color} />
            <View style={{ gap: 10, marginTop: 14 }}>
              {h.factors.map((f: any) => (
                <View key={f.id}>
                  <View style={[k.row, { justifyContent: "space-between" }]}>
                    <T style={{ fontSize: 13 }}>{f.label}</T>
                    <Muted>
                      {Math.round(f.score * f.weight)}/{f.weight}
                    </Muted>
                  </View>
                  <Muted style={{ fontSize: 11 }}>{f.detail}</Muted>
                </View>
              ))}
            </View>
            <Button title="Registrar nota deste mês" secondary icon="bookmark" onPress={recordScore} />
            {!!history.length && (
              <Muted style={{ marginTop: 8 }}>Histórico: {history.map((x) => `${x.month.slice(5)}/${x.month.slice(2, 4)} ${x.score}`).join(" · ")}</Muted>
            )}
          </Box>
          <Section title="Destaques do mês" />
          <Box>{insights.length ? insights.map((i: any, n: number) => <Muted key={n} style={{ marginBottom: 6 }}>• {i.text}</Muted>) : <Muted>Nada fora do comum neste mês.</Muted>}</Box>
          <Section title="Plano de ação" />
          <Box>
            {plan.map((p: any, n: number) => (
              <View key={n} style={{ marginBottom: 10 }}>
                <T style={{ fontSize: 13 }}>
                  {n + 1}. {p.title}
                </T>
                <Muted style={{ fontSize: 11 }}>{p.why}</Muted>
              </View>
            ))}
          </Box>
          <Section title="Resumo do mês" />
          <Box>
            {narrative ? <T style={{ fontSize: 13 }}>{narrative}</T> : <Muted>{online ? "Gere um resumo narrativo com a IA configurada." : "Configure uma chave e autorize o envio do resumo para gerar um texto narrativo. Os números acima são calculados no aparelho."}</Muted>}
            {online && (
              <Button
                title={busy === "summary" ? "Gerando…" : "Gerar resumo com IA"}
                secondary
                disabled={!!busy}
                onPress={() =>
                  run("summary", async () =>
                    setNarrative(await ask(ai, aiContext(state), [{ role: "user", text: "Escreva um resumo do meu mês em até 6 frases, com os destaques e 2 sugestões práticas." }])),
                  )
                }
              />
            )}
          </Box>
        </>
      )}
      {view === "chat" &&
        (online ? (
          <>
            {chat.map((m, i) => (
              <Box key={i} style={{ backgroundColor: m.role === "user" ? c.soft : c.surface }}>
                <Muted style={{ fontSize: 11 }}>{m.role === "user" ? "Você" : "Assistente"}</Muted>
                <T style={{ fontSize: 13 }}>{m.text}</T>
              </Box>
            ))}
            {busy === "chat" && <ActivityIndicator color={c.primary} />}
            <Field label="Pergunte sobre seus gastos, metas ou orçamentos" value={question} onChange={setQuestion} multiline />
            <Button
              title="Enviar"
              icon="send"
              disabled={!question.trim() || !!busy}
              onPress={() =>
                run("chat", async () => {
                  const next = [...chat, { role: "user" as const, text: question.trim() }];
                  setChat(next);
                  setQuestion("");
                  const answer = await ask(ai, aiContext(state), next.slice(-10));
                  setChat([...next, { role: "assistant", text: answer }]);
                })
              }
            />
            <Muted>Cada pergunta envia ao provedor só o resumo agregado (totais, categorias, metas e orçamentos), sem descrições nem nomes de contas.</Muted>
          </>
        ) : (
          <Box>
            <T>O chat usa um provedor de IA com a sua própria chave.</T>
            <Muted style={{ marginTop: 6 }}>Sem chave, os insights, a nota e o plano de ação continuam funcionando no aparelho.</Muted>
            <Button title="Configurar chave" secondary onPress={() => setView("setup")} />
          </Box>
        ))}
      {view === "setup" && (
        <>
          <Choice label="Provedor" values={Object.entries(PROVIDERS).map(([id, p]) => [id as Provider, p.label])} value={ai.provider} onChange={(v) => saveAi({ provider: v, model: "" })} />
          <Muted>{PROVIDERS[ai.provider as Provider].hint}</Muted>
          <Field label={`Modelo (padrão: ${PROVIDERS[ai.provider as Provider].model})`} value={ai.model} onChange={(v) => saveAi({ model: v })} />
          <Field label={hasKey ? "Chave de API (salva — digite para trocar)" : "Chave de API"} value={keyText} onChange={setKeyText} />
          <Button
            title="Salvar chave"
            disabled={!keyText.trim()}
            onPress={() =>
              run("key", async () => {
                await setKey(keyText.trim());
                setKeyText("");
                setHasKey(true);
              })
            }
          />
          {hasKey && (
            <>
              <Button
                title={busy === "test" ? "Testando…" : "Testar conexão"}
                secondary
                disabled={!!busy}
                onPress={() => run("test", async () => setError("Conexão ok: " + (await ask(ai, "teste", [{ role: "user", text: "Responda apenas: ok" }])).slice(0, 40)))}
              />
              <Button
                title="Remover chave"
                danger
                onPress={() =>
                  run("rm", async () => {
                    await setKey("");
                    setHasKey(false);
                  })
                }
              />
            </>
          )}
          <Box>
            <Toggle
              label="Autorizo enviar o resumo agregado ao provedor"
              value={!!ai.consent}
              onChange={(v) => saveAi({ consent: v })}
              hint="Vai: totais do mês, categorias, metas, orçamentos e a nota. Não vai: descrições, observações, nomes de contas ou cartões. Custos do provedor são da sua conta."
            />
          </Box>
          <Muted>A chave fica guardada só neste aparelho, no cofre do Android, e não entra no backup.</Muted>
        </>
      )}
      {!!error && <Muted style={{ color: error.startsWith("Conexão ok") ? c.green : c.red, marginTop: 8 }}>{error}</Muted>}
    </>
  );
}
