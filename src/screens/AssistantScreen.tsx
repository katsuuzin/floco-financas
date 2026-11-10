// F8 — Assistente: insights e saúde financeira locais; chat, resumo e plano com IA opcional.
import React, { useEffect, useState, useMemo } from "react";
import { View, ActivityIndicator } from "react-native";
import {
  T,
  Muted,
  Box,
  Section,
  Button,
  Field,
  Choice,
  Chips,
  Toggle,
  Progress,
  styles as k,
} from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import {
  answerLocal,
  localSummary,
  LOCAL_QUESTIONS,
  monthInsights,
  healthScore,
  actionPlan,
  aiContext,
} from "../insights.mjs";
import { monthKey, today } from "../finance.mjs";
import { ask, getKey, setKey, PROVIDERS, Provider } from "../app/ai";
import { looksLikeSecret } from "../ai-model.mjs";

export default function AssistantScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [view, setView] = useState<"overview" | "chat" | "setup">("overview");
  const ai = {
    provider: "gemini" as Provider,
    model: "",
    consent: false,
    ...(state.settings.ai || {}),
  };
  const [hasKey, setHasKey] = useState(false);
  const [keyText, setKeyText] = useState("");
  const [modelWarning, setModelWarning] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [question, setQuestion] = useState("");
  const [narrative, setNarrative] = useState("");
  useEffect(() => {
    let alive = true;
    setHasKey(false);
    setKeyText("");
    getKey(ai.provider)
      .then((k) => {
        if (alive) setHasKey(!!k);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ai.provider]);
  // Uma chave colada por engano no campo Modelo ficaria nas configurações (e nos backups): apaga ao abrir.
  useEffect(() => {
    if (looksLikeSecret(state.settings.ai?.model)) {
      void saveAi({ model: "" });
      setModelWarning("Havia uma chave de API no campo Modelo. Apaguei de lá. Cole a chave só no campo Chave de API.");
    }
  }, [state.settings.ai?.model]);
  const h = useMemo(() => healthScore(state), [state]);
  const insights = useMemo(
    () => monthInsights(state, monthKey(today())),
    [state],
  );
  const plan = useMemo(() => actionPlan(state), [state]);
  const history: any[] = state.settings.healthHistory || [];
  const saveAi = (patch: any) =>
    perform(
      (s: any) => ({
        ...s,
        settings: {
          ...s.settings,
          ai: { ...ai, ...(s.settings.ai || {}), ...patch },
        },
      }),
      "Assistente atualizado",
    );
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
    perform((s: any) => {
      const list = (s.settings.healthHistory || []).filter(
        (x: any) => x.month !== h.month,
      );
      return {
        ...s,
        settings: {
          ...s.settings,
          healthHistory: [
            ...list,
            { month: h.month, score: h.score, date: today() },
          ].slice(-24),
        },
      };
    }, "Nota registrada no histórico");
  const color =
    h.score >= 80
      ? c.green
      : h.score >= 60
        ? c.primary
        : h.score >= 40
          ? c.amber
          : c.red;

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
                    <T style={{ fontSize: 13, flex: 1, flexShrink: 1 }}>
                      {f.label}
                    </T>
                    <Muted style={{ flexShrink: 0 }}>
                      {Math.round(f.score * f.weight)}/{f.weight}
                    </Muted>
                  </View>
                  <Muted style={{ fontSize: 11 }}>{f.detail}</Muted>
                </View>
              ))}
            </View>
            <Button
              title="Registrar nota deste mês"
              secondary
              icon="bookmark"
              onPress={recordScore}
            />
            {!!history.length && (
              <Muted style={{ marginTop: 8 }}>
                Histórico:{" "}
                {history
                  .map(
                    (x) =>
                      `${x.month.slice(5)}/${x.month.slice(2, 4)} ${x.score}`,
                  )
                  .join(" · ")}
              </Muted>
            )}
          </Box>
          <Section title="Destaques do mês" />
          <Box>
            {insights.length ? (
              insights.map((i: any, n: number) => (
                <Muted key={n} style={{ marginBottom: 6 }}>
                  • {i.text}
                </Muted>
              ))
            ) : (
              <Muted>Nada fora do comum neste mês.</Muted>
            )}
          </Box>
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
            {narrative ? (
              <T style={{ fontSize: 13 }}>{narrative}</T>
            ) : (
              <Muted>
                {online
                  ? "Gere um resumo narrativo com a IA configurada."
                  : "Gere um resumo calculado dos seus registros, sem enviar dados."}
              </Muted>
            )}
            {!online && (
              <Button
                title="Gerar resumo local"
                secondary
                onPress={() => setNarrative(localSummary(state))}
              />
            )}
            {online && (
              <Button
                title={busy === "summary" ? "Gerando…" : "Gerar resumo com IA"}
                secondary
                disabled={!!busy}
                onPress={() =>
                  run("summary", async () =>
                    setNarrative(
                      await ask(ai, aiContext(state), [
                        {
                          role: "user",
                          text: "Escreva um resumo do meu mês em até 6 frases, com os destaques e 2 sugestões práticas.",
                        },
                      ]),
                    ),
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
              <Box
                key={i}
                style={{
                  backgroundColor: m.role === "user" ? c.soft : c.surface,
                }}
              >
                <Muted style={{ fontSize: 11 }}>
                  {m.role === "user" ? "Você" : "Assistente"}
                </Muted>
                <T style={{ fontSize: 13 }}>{m.text}</T>
              </Box>
            ))}
            {busy === "chat" && <ActivityIndicator color={c.primary} />}
            <Field
              label="Pergunte sobre seus gastos, metas ou orçamentos"
              value={question}
              onChange={setQuestion}
              multiline
            />
            <Button
              title="Enviar"
              icon="send"
              disabled={!question.trim() || !!busy}
              onPress={() =>
                run("chat", async () => {
                  const next = [
                    ...chat.slice(-18),
                    { role: "user" as const, text: question.trim() },
                  ];
                  setChat(next);
                  setQuestion("");
                  const answer = await ask(
                    ai,
                    aiContext(state),
                    next.slice(-10),
                  );
                  setChat([...next, { role: "assistant", text: answer }]);
                })
              }
            />
            <Muted>
              Cada pergunta envia ao provedor só o resumo agregado (totais,
              categorias, metas e orçamentos), sem descrições nem nomes de
              contas.
            </Muted>
          </>
        ) : (
          <>
            <Box>
              <T>Assistente local — sem chave</T>
              <Muted>
                Respostas calculadas no aparelho. Seus registros não são
                enviados a provedores.
              </Muted>
            </Box>
            {!chat.length &&
              LOCAL_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  title={q}
                  secondary
                  onPress={() =>
                    setChat([
                      ...chat.slice(-18),
                      { role: "user", text: q },
                      { role: "assistant", text: answerLocal(state, q) },
                    ])
                  }
                />
              ))}
            {chat.map((m, i) => (
              <Box key={i}>
                <View accessible accessibilityLiveRegion="polite">
                  <Muted>
                    {m.role === "user" ? "Você" : "Assistente local"}
                  </Muted>
                  <T>{m.text}</T>
                </View>
              </Box>
            ))}
            <Field
              label="Pergunta para o assistente local"
              value={question}
              onChange={setQuestion}
              multiline
            />
            <Button
              title="Consultar meus registros"
              disabled={!question.trim()}
              onPress={() => {
                const q = question.trim();
                setChat([
                  ...chat.slice(-18),
                  { role: "user", text: q },
                  { role: "assistant", text: answerLocal(state, q) },
                ]);
                setQuestion("");
              }}
            />
          </>
        ))}
      {view === "setup" && (
        <>
          <Choice
            label="Provedor"
            values={Object.entries(PROVIDERS).map(([id, p]) => [
              id as Provider,
              p.label,
            ])}
            value={ai.provider}
            onChange={(v) => saveAi({ provider: v, model: "" })}
          />
          <Muted>{PROVIDERS[ai.provider as Provider].hint}</Muted>
          <Field
            label={`Modelo (padrão: ${PROVIDERS[ai.provider as Provider].model})`}
            value={looksLikeSecret(ai.model) ? "" : ai.model}
            onChange={(v) => {
              if (looksLikeSecret(v)) {
                setModelWarning("Isso parece uma chave de API. Cole-a no campo Chave de API, abaixo. Aqui vai só o nome do modelo.");
                return;
              }
              setModelWarning("");
              void saveAi({ model: v });
            }}
            hint={modelWarning || undefined}
          />
          <Field
            secure
            label={
              hasKey
                ? "Chave de API (salva — digite para trocar)"
                : "Chave de API"
            }
            value={keyText}
            onChange={setKeyText}
          />
          <Button
            title="Salvar chave"
            disabled={!keyText.trim()}
            onPress={() =>
              run("key", async () => {
                await setKey(keyText.trim(), ai.provider);
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
                onPress={() =>
                  run("test", async () =>
                    setError(
                      "Conexão ok: " +
                        (
                          await ask(ai, "teste", [
                            { role: "user", text: "Responda apenas: ok" },
                          ])
                        ).slice(0, 40),
                    ),
                  )
                }
              />
              <Button
                title="Remover chave"
                danger
                onPress={() =>
                  run("rm", async () => {
                    await setKey("", ai.provider);
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
          <Muted>
            A chave fica guardada só neste aparelho, no cofre do Android, e não
            entra no backup.
          </Muted>
        </>
      )}
      {!!error && (
        <Muted
          style={{
            color: error.startsWith("Conexão ok") ? c.green : c.red,
            marginTop: 8,
          }}
        >
          {error}
        </Muted>
      )}
    </>
  );
}
