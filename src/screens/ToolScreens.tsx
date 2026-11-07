// F5: regras de categorização (F7) e conferência de fatura (F2).
import React, { useMemo, useState } from "react";
import { View, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { T, Muted, Box, Section, Button, Field, Choice, Chips, IconButton, Toggle, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { categoryNames } from "../planning.mjs";
import { saveRule, categorize, previewRules, applyRules, seedRules, reconcileInvoice } from "../rules.mjs";
import { parseOFX, parseCSV } from "../imports.mjs";
import { money, addTransaction } from "../finance.mjs";
import MonthBar from "./MonthBar";

const br = (d: string) => d.split("-").reverse().join("/");

export function RulesScreen() {
  const { c } = useTheme();
  const { state, perform, confirm } = useStore();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [probe, setProbe] = useState("");
  const [draft, setDraft] = useState({ id: "", pattern: "", category: "Outros", priority: "10" });
  const [scope, setScope] = useState<"all" | "uncategorized">("uncategorized");
  const [preview, setPreview] = useState<any[] | null>(null);
  const rules = (state.rules || []).filter((r: any) => r.type === type);
  const hit = probe.trim() ? categorize(state, probe, type) : null;
  const save = () =>
    perform(
      (s: any) => saveRule(s, { ...draft, id: draft.id || undefined, type, priority: Number(draft.priority) }),
      draft.id ? "Regra atualizada" : "Regra criada",
    ).then((ok) => ok && setDraft({ id: "", pattern: "", category: draft.category, priority: "10" }));
  return (
    <>
      <Chips
        values={[
          ["expense", "Despesa"],
          ["income", "Receita"],
        ]}
        value={type}
        onChange={setType}
      />
      <Box style={{ gap: 8 }}>
        <Field label="Testar uma descrição" value={probe} onChange={setProbe} placeholder="Ex.: UBER *TRIP" />
        {!!probe.trim() && (
          <T style={{ color: hit ? c.green : c.muted }}>{hit ? `→ ${hit.category} (regra “${hit.pattern}”)` : "Nenhuma regra se aplica."}</T>
        )}
        <Muted>Acentos e pontuação são ignorados. Use * como coringa e | para alternativas.</Muted>
      </Box>
      <Section title={draft.id ? "Editar regra" : "Nova regra"} />
      <Box style={{ gap: 12 }}>
        <Field label="Padrão" value={draft.pattern} onChange={(v) => setDraft({ ...draft, pattern: v })} placeholder="PADARIA*|PANIFICADORA*" />
        <Choice label="Categoria" values={categoryNames(state).map((x: string) => [x, x])} value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} />
        <Field label="Prioridade (0 a 100)" value={draft.priority} onChange={(v) => setDraft({ ...draft, priority: v })} numeric maxLength={3} />
        <Button title={draft.id ? "Salvar regra" : "Criar regra"} icon="check" onPress={save} disabled={!draft.pattern.trim()} />
        {!!draft.id && <Button title="Cancelar edição" secondary onPress={() => setDraft({ id: "", pattern: "", category: "Outros", priority: "10" })} />}
      </Box>
      <Section title="Aplicar no histórico" />
      <Box style={{ gap: 10 }}>
        <Chips
          values={[
            ["uncategorized", "Só “Outros”"],
            ["all", "Tudo"],
          ]}
          value={scope}
          onChange={(v) => {
            setScope(v);
            setPreview(null);
          }}
        />
        <Button title="Ver prévia" secondary icon="eye" onPress={() => setPreview(previewRules(state, scope))} />
        {preview && (
          <>
            <Muted>{preview.length ? `${preview.length} lançamentos mudariam de categoria:` : "Nada mudaria."}</Muted>
            {preview.slice(0, 30).map((p) => (
              <Muted key={p.id}>
                {p.description}: {p.from} → {p.to}
              </Muted>
            ))}
            {preview.length > 0 && (
              <Button
                title={`Aplicar em ${preview.length}`}
                icon="check"
                onPress={() =>
                  confirm("Aplicar regras?", "As categorias desses lançamentos serão trocadas. Faça um backup antes, se quiser poder voltar.", () =>
                    perform((s: any) => applyRules(s, preview.map((p) => p.id)), "Categorias atualizadas").then(() => setPreview(null)),
                  )
                }
              />
            )}
          </>
        )}
        <Muted>A prévia só é calculada quando você pede, porque percorre todos os lançamentos antigos.</Muted>
      </Box>
      <Section title={`Regras (${rules.length})`} />
      {!state.rules?.length && <Button title="Carregar regras sugeridas" secondary onPress={() => perform((s: any) => seedRules(s), "Regras sugeridas carregadas")} />}
      {rules
        .slice()
        .sort((a: any, b: any) => b.priority - a.priority || a.pattern.localeCompare(b.pattern))
        .map((r: any) => (
          <Box key={r.id} style={[k.row, { paddingVertical: 8 }]}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: "SoraSemi", opacity: r.active ? 1 : 0.5 }} numberOfLines={2}>
                {r.pattern}
              </T>
              <Muted>
                {r.category} · prioridade {r.priority}
                {r.active ? "" : " · desligada"}
              </Muted>
            </View>
            <IconButton name="edit-2" label={`Editar regra ${r.pattern}`} onPress={() => setDraft({ id: r.id, pattern: r.pattern, category: r.category, priority: String(r.priority) })} />
            <IconButton
              name={r.active ? "toggle-right" : "toggle-left"}
              label={r.active ? "Desligar regra" : "Ligar regra"}
              onPress={() => perform((s: any) => ({ ...s, rules: s.rules.map((x: any) => (x.id === r.id ? { ...x, active: !x.active } : x)) }), "Regra alterada")}
            />
            <IconButton
              name="trash-2"
              label={`Excluir regra ${r.pattern}`}
              onPress={() => confirm("Excluir regra?", r.pattern, () => perform((s: any) => ({ ...s, rules: s.rules.filter((x: any) => x.id !== r.id) }), "Regra excluída"))}
            />
          </Box>
        ))}
    </>
  );
}

export function ReconcileScreen() {
  const { c } = useTheme();
  const { state, show, perform } = useStore();
  const nav = useNav();
  const cards = state.cards.filter((x: any) => !x.archived);
  const [cardId, setCardId] = useState(cards[0]?.id || "");
  const [rows, setRows] = useState<any[] | null>(null);
  const [file, setFile] = useState("");
  const month = nav.month;
  const result = useMemo(() => (rows && cardId ? reconcileInvoice(state, cardId, month, rows) : null), [rows, cardId, month, state]);
  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ["text/*", "application/x-ofx", "application/octet-stream", "*/*"], copyToCacheDirectory: true });
      if (r.canceled) return;
      const asset = r.assets[0];
      if ((asset.size || 0) > 10 * 1024 * 1024) throw Error("Arquivo acima de 10 MB.");
      const text = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = /<STMTTRN>/i.test(text) ? parseOFX(text) : parseCSV(text, text.split("\n")[0].includes(";") ? ";" : ",");
      // Na fatura, valores positivos do arquivo do banco são compras.
      setRows(parsed.map((x: any) => (x.error ? x : { ...x, type: /<STMTTRN>/i.test(text) ? (x.type === "income" ? "income" : "expense") : "expense" })));
      setFile(asset.name);
    } catch (e: any) {
      Alert.alert("Não foi possível ler o arquivo", e.message);
    }
  };
  const addMissing = (r: any) =>
    perform(
      (s: any) =>
        addTransaction(s, { type: "expense", amount: r.amount, date: r.date, description: r.description, category: categorize(s, r.description)?.category || "Outros", cardId }),
      "Compra lançada",
    );
  if (!cards.length) return <Muted>Cadastre um cartão para conferir a fatura.</Muted>;
  return (
    <>
      <Muted>Importe a fatura do banco (OFX ou CSV) e compare com o que já foi lançado. Tudo acontece no aparelho e nada é gravado sem você confirmar.</Muted>
      <Choice label="Cartão" values={cards.map((x: any) => [x.id, x.name])} value={cardId} onChange={setCardId} />
      <MonthBar />
      <Button title={file ? `Trocar arquivo (${file})` : "Escolher arquivo da fatura"} icon="upload" onPress={pick} />
      <Muted>PDF com senha e prints: use “Importar comprovante” para ler pelo OCR. OFX e CSV são lidos sem erro de reconhecimento.</Muted>
      {result && (
        <>
          <Box>
            <View style={k.row}>
              <View style={k.flex}>
                <Muted>No arquivo</Muted>
                <T style={{ fontFamily: "SoraSemi" }}>{show(result.fileTotal)}</T>
              </View>
              <View style={k.flex}>
                <Muted>No Floco</Muted>
                <T style={{ fontFamily: "SoraSemi" }}>{show(result.appTotal)}</T>
              </View>
              <View style={k.flex}>
                <Muted>Diferença</Muted>
                <T style={{ fontFamily: "SoraSemi", color: result.diff ? c.red : c.green }}>{show(Math.abs(result.diff))}</T>
              </View>
            </View>
            <Muted style={{ marginTop: 8 }}>{result.matched.length} conferidos · {result.divergent.length} com valor diferente · {result.missing.length} faltando · {result.extra.length} só no Floco</Muted>
          </Box>
          {!!result.missing.length && <Section title="Faltando no Floco" />}
          {result.missing.map((r: any, i: number) => (
            <Box key={"m" + i} style={[k.row]}>
              <View style={{ flex: 1 }}>
                <T>{r.description}</T>
                <Muted>
                  {br(r.date)} · {money(r.amount)}
                </Muted>
              </View>
              <Button title="Lançar" secondary onPress={() => addMissing(r)} />
            </Box>
          ))}
          {!!result.divergent.length && <Section title="Valor diferente" />}
          {result.divergent.map((d: any, i: number) => (
            <Box key={"d" + i}>
              <T>{d.row.description}</T>
              <Muted>
                Banco {money(d.row.amount)} · Floco {money(d.tx.amount)} ({d.diff > 0 ? "+" : "−"}
                {money(Math.abs(d.diff))})
              </Muted>
            </Box>
          ))}
          {!!result.extra.length && <Section title="Só no Floco" />}
          {result.extra.map((t: any) => (
            <Box key={t.id}>
              <T>{t.description}</T>
              <Muted>
                {br(t.date)} · {money(t.amount)} — confira se a compra é desta fatura.
              </Muted>
            </Box>
          ))}
        </>
      )}
    </>
  );
}
