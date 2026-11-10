import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import { Box, Button, I, Muted, Section, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { formatCnpj } from "../nfce.mjs";
import { MAX_HTML_CHARS, allowedHosts, consultUrl, isAllowedUrl, nfceToPurchase, parseNfceHtml } from "../nfceParse.mjs";
import { purchasesOf, recordPurchase } from "../shoppingPurchases.mjs";
import { applyConferencia, matchListToNota } from "../shoppingMatch.mjs";
import { itemsOf } from "../shopping.mjs";

const TIMEOUT_MS = 45000;
// A página real tem ~40 KB. O teto vale para o texto bruto da mensagem, antes de qualquer JSON.parse.
const MAX_RAW = MAX_HTML_CHARS + 10_000;

// Roda dentro da página da SEFAZ: espera a tabela de itens e devolve o HTML ao app (como um leitor de tela faria).
const PAGE_SCRIPT = `
(function () {
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var body = document.body ? document.body.innerText : "";
    if (/Request Rejected/i.test(body) && body.length < 600) {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "rejected" }));
      return;
    }
    if (document.querySelector('#tabResult, tr[id^="Item"]') && document.readyState === "complete") {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "html", href: String(location.href), html: document.documentElement.outerHTML }));
    }
    if (tries > 120) clearInterval(timer);
  }, 400);
})();
true;
`;

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

// Consulta a nota no site da SEFAZ (WebView), lê os itens no aparelho e salva a compra no histórico.
export default function NfceConsultaScreen({ info }: { info: any }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const nav = useNav();
  const [phase, setPhase] = useState<"loading" | "preview" | "saved" | "error">("loading");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [attempt, setAttempt] = useState(0);
  const [off, setOff] = useState<Record<string, boolean>>({}); // pares desmarcados na conferência
  const [applied, setApplied] = useState(0);
  const [used, setUsed] = useState<number[]>([]); // linhas da nota já usadas na conferência
  const done = useRef(false);

  const url = useMemo(() => {
    try {
      return consultUrl(info);
    } catch {
      return "";
    }
  }, [info]);

  const fail = (msg: string) => {
    if (done.current) return;
    done.current = true;
    setError(msg);
    setPhase("error");
  };

  useEffect(() => {
    done.current = false;
    setPhase("loading");
    setError("");
    if (!url || !isAllowedUrl(url, info.uf)) {
      fail("Endereço de consulta inválido para esta nota.");
      return;
    }
    const t = setTimeout(() => fail("A SEFAZ demorou para responder. Tente de novo."), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [attempt, url]);

  const onMessage = (e: any) => {
    if (done.current) return;
    try {
      const raw = e.nativeEvent.data;
      if (typeof raw !== "string" || raw.length > MAX_RAW) return fail("Resposta inesperada da SEFAZ.");
      const msg = JSON.parse(raw);
      // A mensagem tem de vir do site oficial e da consulta desta nota (não de outra página nem de outra chave).
      if (!msg || !isAllowedUrl(msg.href, info.uf) || !String(msg.href).includes(info.chave)) return fail("A resposta não veio da consulta desta nota.");
      if (msg.type === "rejected") return fail("A SEFAZ recusou a consulta agora. Tente de novo em alguns minutos.");
      if (msg.type !== "html" || typeof msg.html !== "string" || msg.html.length > MAX_HTML_CHARS) return fail("Resposta inesperada da SEFAZ.");
      const nota = parseNfceHtml(msg.html, { uf: info.uf });
      if (nota.chave && nota.chave !== info.chave) return fail("A nota consultada não é a que você leu. Tente ler o QR de novo.");
      done.current = true;
      setParsed(nota);
      setPhase("preview");
    } catch (err: any) {
      fail(err?.message || "Não consegui ler a nota.");
    }
  };

  const conf = useMemo(() => (parsed ? matchListToNota(state, parsed.items, { skip: new Set(used) }) : null), [state.shoppingItems, parsed, used]);
  const picks = conf ? conf.matches.filter((m: any) => !off[m.listItemId]) : [];
  const pendingCount = itemsOf(state).filter((i: any) => !i.inCart).length;

  const applyMatches = async () => {
    const n = picks.length;
    const ok = await perform((st: any) => applyConferencia(st, picks, parsed.items), "");
    if (ok) {
      setApplied((a) => a + n);
      setUsed((u) => [...u, ...picks.map((p: any) => p.notaIndex)]);
    }
  };

  const existing = parsed ? purchasesOf(state).find((p: any) => p.chave && p.chave === (parsed.chave || info.chave)) : null;

  const save = async () => {
    try {
      const entrada = nfceToPurchase(parsed, info);
      recordPurchase(state, entrada); // valida antes de gravar
      const ok = await perform((s: any) => recordPurchase(s, entrada), "Compra salva");
      if (ok) setPhase("saved");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toExpense = () =>
    nav.push({
      name: "form",
      kind: "transaction",
      initial: {
        type: "expense",
        amount: (parsed.totalCents / 100).toFixed(2).replace(".", ","),
        description: `Compra - ${parsed.marketName || "mercado"}`.slice(0, 80),
        date: parsed.issuedDate || undefined,
      },
    });

  // Depois de salvar (ou ao voltar do formulário de despesa, que remonta a tela) mostra o estado de nota salva.
  if (phase === "saved" || (phase === "preview" && parsed && existing))
    return (
      <>
        <View accessibilityLiveRegion="polite">
          <Box>
            <View style={[k.row, { gap: 8 }]}>
              <I name="check-circle" color={c.green} />
              <T style={{ fontFamily: "SoraSemi", flex: 1 }}>{phase === "saved" ? "Compra salva no histórico" : "Esta nota já está no histórico"}</T>
            </View>
            <Muted style={{ marginTop: 8 }}>{`${parsed.items.length} itens · ${show(parsed.totalCents)}`}</Muted>
          </Box>
        </View>
        {(pendingCount > 0 || applied > 0) && conf && (
          <>
            <Section title="Conferência com a lista" />
            <Box>
              {applied > 0 && conf.matches.length === 0 ? (
                <View accessibilityLiveRegion="polite" style={[k.row, { gap: 8 }]}>
                  <I name="check-circle" color={c.green} />
                  <T style={{ flex: 1 }}>{`${applied} ${applied === 1 ? "item marcado" : "itens marcados"} como comprado${applied === 1 ? "" : "s"}`}</T>
                </View>
              ) : conf.matches.length === 0 ? (
                <Muted>Nenhum item pendente da lista apareceu nesta nota.</Muted>
              ) : (
                <>
                  <T style={{ fontFamily: "SoraSemi" }}>{`${conf.matches.length} de ${pendingCount} itens da lista estão na nota`}</T>
                  <Muted style={{ marginBottom: 8 }}>Toque para tirar da conferência o que não for o mesmo produto.</Muted>
                  {conf.matches.map((m: any) => {
                    const on = !off[m.listItemId];
                    return (
                      <Pressable
                        key={m.listItemId}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${m.listName}, na nota como ${m.notaName}${m.qtyShort ? ", quantidade menor que a pedida" : ""}`}
                        onPress={() => setOff((o) => ({ ...o, [m.listItemId]: on }))}
                        style={[k.row, { minHeight: 56, gap: 12, paddingVertical: 4 }]}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            borderWidth: 2,
                            borderColor: on ? c.primary : c.muted,
                            backgroundColor: on ? c.primary : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {on && <I name="check" size={16} color={c.onPrimary} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <T numberOfLines={1}>{m.listName}</T>
                          <Muted numberOfLines={1}>{`na nota: ${m.notaName}${m.qtyShort ? " · menos que o pedido" : ""}`}</Muted>
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}
              {conf.notInNota.length > 0 && conf.matches.length + applied > 0 && (
                <Muted style={{ marginTop: 8 }}>{`Não vieram na nota: ${conf.notInNota.slice(0, 5).map((i: any) => i.name).join(", ")}${conf.notInNota.length > 5 ? ` e mais ${conf.notInNota.length - 5}` : ""}.`}</Muted>
              )}
              {conf.notInList.length > 0 && <Muted>{`${conf.notInList.length} itens da nota não estavam na lista.`}</Muted>}
            </Box>
          </>
        )}
        <View style={{ gap: 8 }}>
          {conf && conf.matches.length > 0 && (
            <Button title={`Marcar ${picks.length} como comprados`} icon="check" disabled={picks.length === 0} onPress={() => void applyMatches()} />
          )}
          <Button title="Registrar como despesa" icon="dollar-sign" secondary={!!conf && conf.matches.length > 0} onPress={toExpense} />
          <Button title="Concluir" secondary onPress={() => nav.replace({ name: "shopping" })} />
        </View>
      </>
    );

  if (phase === "preview" && parsed) {
    const shown = parsed.items.slice(0, 8);
    return (
      <>
        <Box>
          <T style={{ fontFamily: "SoraSemi" }}>{parsed.marketName || "Mercado"}</T>
          <Muted>{`CNPJ ${formatCnpj(parsed.cnpj)}`}</Muted>
          <Muted>{`${brDate(parsed.issuedDate)} ${parsed.issuedTime}`.trim()}</Muted>
          <View style={[k.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <Muted>{`${parsed.items.length} itens${parsed.payment ? ` · ${parsed.payment}` : ""}`}</Muted>
            <T style={{ fontFamily: "SoraSemi", fontVariant: ["tabular-nums"] }}>{show(parsed.totalCents)}</T>
          </View>
        </Box>
        {!parsed.totalMatchesItems && (
          <Muted style={{ color: c.amber, marginBottom: 12 }}>
            {`A soma dos itens (${show(parsed.itemsSumCents)}) não bate com o total da nota. Confira antes de salvar.`}
          </Muted>
        )}
        <Section title="Itens" />
        <Box style={{ padding: 0, overflow: "hidden" }}>
          {shown.map((i: any, idx: number) => (
            <View key={idx} style={[k.row, idx < shown.length - 1 && k.hairline, { borderBottomColor: c.line, padding: 12, gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <T numberOfLines={2}>{i.name}</T>
                <Muted>{`${String(i.qty).replace(".", ",")}${i.unit ? ` ${i.unit}` : "x"} · ${show(i.unitPriceCents)}`}</Muted>
              </View>
              <T style={{ fontVariant: ["tabular-nums"] }}>{show(i.totalCents)}</T>
            </View>
          ))}
        </Box>
        {parsed.items.length > shown.length && <Muted style={{ marginTop: 8 }}>{`e mais ${parsed.items.length - shown.length} itens`}</Muted>}
        {!!error && (
          <Muted accessibilityLiveRegion="polite" style={{ color: c.red, marginTop: 12 }}>
            {error}
          </Muted>
        )}
        <View style={{ marginTop: 16, gap: 8 }}>
          <Button title="Salvar compra" icon="check" onPress={() => void save()} />
          <Button title="Ler outra nota" secondary onPress={() => nav.back()} />
        </View>
      </>
    );
  }

  if (phase === "error")
    return (
      <>
        <Box>
          <View style={[k.row, { gap: 8 }]}>
            <I name="alert-circle" color={c.red} />
            <T style={{ fontFamily: "SoraSemi", flex: 1 }}>Não consegui consultar a nota</T>
          </View>
          <Muted accessibilityLiveRegion="polite" style={{ marginTop: 8 }}>
            {error}
          </Muted>
        </Box>
        <View style={{ gap: 8 }}>
          <Button title="Tentar de novo" icon="refresh-cw" onPress={() => setAttempt((n) => n + 1)} />
          <Button title="Voltar" secondary onPress={() => nav.back()} />
        </View>
      </>
    );

  return (
    <>
      <View accessibilityLiveRegion="polite">
        <Muted>Consultando a nota no site da SEFAZ…</Muted>
      </View>
      <View
        accessible
        accessibilityLabel="Página da SEFAZ carregando"
        style={{ marginTop: 12, height: 360, borderRadius: 18, overflow: "hidden", backgroundColor: c.surface }}
      >
        <WebView
          key={attempt}
          source={{ uri: url }}
          originWhitelist={allowedHosts(info.uf).map((h: string) => `https://${h}`)}
          onShouldStartLoadWithRequest={(req) => isAllowedUrl(req.url, info.uf)}
          injectedJavaScript={PAGE_SCRIPT}
          onMessage={onMessage}
          onError={() => fail("Sem conexão com a SEFAZ. Verifique a internet e tente de novo.")}
          onHttpError={(e) => e.nativeEvent.statusCode >= 500 && fail("O site da SEFAZ está fora do ar. Tente mais tarde.")}
          javaScriptEnabled
          domStorageEnabled
          incognito
          cacheEnabled={false}
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          allowsLinkPreview={false}
          mixedContentMode="never"
          geolocationEnabled={false}
        />
      </View>
      <Muted style={{ marginTop: 8 }}>A página é aberta só para ler os itens. Nada é enviado a ninguém além da SEFAZ.</Muted>
    </>
  );
}
