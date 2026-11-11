import React, { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { interpretShoppingText, getKey, PROVIDERS, shoppingAIConfig } from "../app/ai";
import { useNav } from "../app/nav";
import { useStore } from "../app/store";
import { parsePastedList } from "../pasteList.mjs";
import { decodeShareCode } from "../shoppingShareCode.mjs";
import { parseShared } from "../shoppingImportShared.mjs";
import { interpretPastedList } from "../pasteListAi.mjs";
import { addShoppingItem, itemsOf, MAX_ITEMS } from "../shopping.mjs";
import { Box, Button, Field, IconButton, Muted, T, styles as k } from "../ui/kit";

type Item = { name: string; qty: number; unit: string };

// Leitura no aparelho: código de compartilhamento do Floco, lista com marcadores (WhatsApp, anotações) ou texto livre.
function readLocal(text: string): { items: Item[]; notice: string } {
  const code: any = decodeShareCode(text.trim());
  if (code.ok) return { items: code.items, notice: "Lista compartilhada reconhecida. Confira antes de adicionar." };
  if (/^\s*(?:[-•*☐☑✅]|\[[ xX✓]?\]|\d+[.)])\s/mu.test(text) || /^\s*Lista de compras/imu.test(text)) {
    const shared = parseShared(text);
    if (shared.items.length) {
      const ignored = shared.ignoredLines.length;
      return {
        items: shared.items,
        notice: ignored ? `${ignored} ${ignored === 1 ? "linha ignorada" : "linhas ignoradas"} (títulos e datas).` : "",
      };
    }
  }
  return { items: parsePastedList(text), notice: "" };
}
const PAGE_SIZE = 20;

export default function ShoppingPastePanel({ onClose }: { onClose: () => void }) {
  const { state, perform } = useStore();
  const nav = useNav();
  const cfg = shoppingAIConfig(state.settings.ai);
  const provider = cfg?.provider;
  const providerLabel = provider ? PROVIDERS[provider].label : "";
  const [hasKey, setHasKey] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const request = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const freeSlots = MAX_ITEMS - itemsOf(state).length;

  useEffect(() => {
    let active = true;
    setHasKey(false);
    if (provider) {
      getKey(provider).then((key) => {
        if (active) setHasKey(Boolean(key));
      }).catch(() => {});
    }
    return () => {
      active = false;
      request.current++;
      pending.current?.abort();
    };
  }, [provider]);

  const preview = async (online: boolean) => {
    if (!text.trim() || busy || saving) return;
    Keyboard.dismiss();
    const id = ++request.current;
    setNotice("");
    setItems(null);
    setVisible(PAGE_SIZE);
    if (!online || !cfg) {
      const local = readLocal(text);
      setItems(local.items);
      setNotice(local.notice);
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    pending.current = controller;
    const result = await interpretPastedList(text, (input: string, { signal }: { signal: AbortSignal }) =>
      interpretShoppingText(cfg, input, signal), { signal: controller.signal });
    if (id !== request.current) return;
    pending.current = null;
    setBusy(false);
    setItems(result.items);
    setNotice(result.source === "ai"
      ? `Sugestões de ${providerLabel}. Confira antes de adicionar.`
      : result.tooLong
        ? "O texto é grande demais para a IA (máximo 12.000 letras). Divida em partes menores."
        : "A IA não respondeu com uma lista válida. Mostrando a leitura feita no aparelho.");
  };

  const add = async () => {
    if (!items?.length || items.length > freeSlots || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      const ok = await perform((current: any) => items.reduce((next, item) =>
        addShoppingItem(next, item.unit
          ? `${item.qty} ${item.unit} ${item.name}`
          : `${item.qty}x ${item.name}`), current),
      items.length === 1 ? "Item adicionado" : `${items.length} itens adicionados`);
      if (ok) onClose();
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Box style={{ gap: 12 }}>
      <Field
        label="Texto da lista ou receita"
        value={text}
        onChange={(value) => {
          request.current++;
          pending.current?.abort();
          setText(value);
          setBusy(false);
          setItems(null);
          setNotice("");
        }}
        multiline
        maxLength={12_000}
        placeholder="Ex.: 2 cebolas, 500 g de farinha e sal"
      />
      <Button title="Ver prévia sem IA" onPress={() => void preview(false)} disabled={!text.trim() || busy || saving} />
      {hasKey ? (
        <>
          <Button title={busy ? "Interpretando…" : "Interpretar com IA"} secondary accessibilityLiveRegion="polite" disabled={!text.trim() || busy || saving} onPress={() => void preview(true)} />
          <Muted accessibilityLiveRegion="polite">{`Ao usar IA, o texto colado será enviado a ${providerLabel}.`}</Muted>
        </>
      ) : (
        <Button title="Configurar IA no Assistente" secondary onPress={() => nav.push({ name: "assistant" })} />
      )}
      {!!notice && <Muted accessibilityLiveRegion="polite">{notice}</Muted>}
      {items !== null && (
        <View style={{ gap: 8 }}>
          <T style={{ fontFamily: "SoraSemi" }} accessibilityLiveRegion="polite">
            {items.length ? `Prévia · ${items.length} ${items.length === 1 ? "item" : "itens"}` : "Nenhum item encontrado"}
          </T>
          {items.slice(0, visible).map((item, index) => (
            <View key={index} style={[k.row, { minHeight: 48, gap: 8 }]}>
              <T style={{ flex: 1 }}>{item.name}</T>
              <Muted>{`${String(item.qty).replace(".", ",")}${item.unit ? ` ${item.unit}` : " un."}`}</Muted>
              <IconButton name="x" label={`Tirar ${item.name} da prévia`} onPress={() => {
                if (!saveLock.current) setItems(items.filter((_, i) => i !== index));
              }} />
            </View>
          ))}
          {visible < items.length && <Button title="Ver mais itens" secondary onPress={() => setVisible(visible + PAGE_SIZE)} />}
          {items.length > freeSlots && <Muted accessibilityLiveRegion="polite">{`Restam ${freeSlots} vagas. Remova itens da prévia para continuar.`}</Muted>}
          {!!items.length && <Button title={saving ? "Adicionando…" : "Adicionar à lista"} accessibilityLiveRegion="polite" disabled={saving || items.length > freeSlots} onPress={() => void add()} />}
        </View>
      )}
      <Button title="Fechar colagem" secondary disabled={saving} onPress={onClose} />
    </Box>
  );
}
