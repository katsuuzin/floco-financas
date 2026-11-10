import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Box, Button, Empty, Field, I, Muted, Section, Segmented, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { formatCnpj } from "../nfce.mjs";
import { today } from "../finance.mjs";
import { restockCandidates } from "../shoppingRhythm.mjs";
import { addShoppingItem } from "../shopping.mjs";
import { priceSummary, productsOf, purchasesOf, removePurchase } from "../shoppingPurchases.mjs";
import RestockList from "./RestockList";
import { displayName, expenseDraftFromPurchase, monthSummary, priceTrend, pricePoints, purchasesByDate, searchProducts } from "../shoppingHistory.mjs";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const brDate = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const unitSuffix = (u: string) => (u ? `/${u}` : "");
const SHOW_MAX = 100;

// Histórico: compras salvas e produtos com preço.
export function PurchasesScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const nav = useNav();
  const [tab, setTab] = useState<"compras" | "produtos">("compras");
  const [query, setQuery] = useState("");

  const purchases: any[] = purchasesByDate(state);
  const products: any[] = tab === "produtos" ? searchProducts(state, query) : [];
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monthSummary(state, ym);

  return (
    <>
      <Segmented
        label="Ver"
        values={[
          ["compras", "Compras"],
          ["produtos", "Produtos"],
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "compras" ? (
        purchases.length === 0 ? (
          <Empty
            icon="shopping-bag"
            title="Nenhuma compra salva"
            body="Leia a nota fiscal de uma compra para guardar os itens e os preços aqui."
            action="Ler nota fiscal"
            onPress={() => nav.push({ name: "scanNota" })}
          />
        ) : (
          <>
            <Box style={{ marginTop: 12, gap: 2 }}>
              <T style={{ fontFamily: "SoraSemi" }}>{`${MONTHS[now.getMonth()]} de ${now.getFullYear()}`}</T>
              <Muted>
                {month.count === 0 ? "Nenhuma compra neste mês" : `${month.count} ${month.count === 1 ? "compra" : "compras"} · ${show(month.totalCents)}`}
              </Muted>
            </Box>
            <Section title="Compras salvas" />
            <Box style={{ padding: 0, overflow: "hidden" }}>
              {purchases.slice(0, SHOW_MAX).map((p, i, all) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Compra em ${p.marketName || "mercado"}, ${brDate(p.date)}, ${p.items.length} itens`}
                  onPress={() => nav.push({ name: "purchaseDetail", id: p.id })}
                  android_ripple={{ color: c.soft }}
                  style={[k.row, i < all.length - 1 && k.hairline, { borderBottomColor: c.line, padding: 16, minHeight: 72, gap: 12 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <T numberOfLines={1} style={{ fontFamily: "SoraSemi" }}>
                      {displayName(p.marketName) || "Compra manual"}
                    </T>
                    <Muted>{`${brDate(p.date)} · ${p.items.length} ${p.items.length === 1 ? "item" : "itens"}`}</Muted>
                  </View>
                  <T style={{ fontVariant: ["tabular-nums"] }}>{show(p.totalCents)}</T>
                  <I name="chevron-right" />
                </Pressable>
              ))}
            </Box>
          </>
        )
      ) : (
        <>
          <RestockSection />
          <View style={{ marginTop: 12 }}>
            <Field label="Buscar produto" value={query} onChange={setQuery} placeholder="Ex.: leite" maxLength={60} />
          </View>
          {productsOf(state).length === 0 ? (
            <Empty icon="tag" title="Nenhum produto ainda" body="Os produtos aparecem quando você salva uma compra." />
          ) : products.length === 0 ? (
            <Muted style={{ marginTop: 12 }}>Nenhum produto com esse nome.</Muted>
          ) : (
            <>
              <Section title={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`} />
              <Box style={{ padding: 0, overflow: "hidden" }}>
                {products.slice(0, SHOW_MAX).map((p, i, all) => {
                  const tr = priceTrend(p);
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${displayName(p.name)}, último preço ${p.lastPriceCents != null ? show(p.lastPriceCents) : "sem preço"}, comprado ${p.buys} ${p.buys === 1 ? "vez" : "vezes"}`}
                      onPress={() => nav.push({ name: "productDetail", id: p.id })}
                      android_ripple={{ color: c.soft }}
                      style={[k.row, i < all.length - 1 && k.hairline, { borderBottomColor: c.line, padding: 16, minHeight: 72, gap: 12 }]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <T numberOfLines={2}>{displayName(p.name)}</T>
                        <Muted>{`comprado ${p.buys}x${tr.dir === "up" ? ` · subiu ${String(tr.pct).replace(".", ",")}%` : tr.dir === "down" ? ` · caiu ${String(tr.pct).replace(".", ",")}%` : ""}`}</Muted>
                      </View>
                      <T style={{ fontVariant: ["tabular-nums"] }}>{p.lastPriceCents != null ? `${show(p.lastPriceCents)}${unitSuffix(p.unit)}` : ""}</T>
                      <I name="chevron-right" />
                    </Pressable>
                  );
                })}
              </Box>
              {products.length > SHOW_MAX && <Muted style={{ marginTop: 8 }}>{`Mostrando ${SHOW_MAX} de ${products.length}. Refine a busca para ver os outros.`}</Muted>}
            </>
          )}
        </>
      )}
    </>
  );
}

// Detalhe de uma compra: itens, registrar como despesa e apagar.
export function PurchaseDetailScreen({ id }: { id: string }) {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const nav = useNav();
  const p: any = purchasesOf(state).find((x: any) => x.id === id);
  if (!p)
    return (
      <>
        <Empty icon="shopping-bag" title="Compra não encontrada" body="Ela pode ter sido apagada." />
        <Button title="Voltar" secondary onPress={() => nav.back()} />
      </>
    );

  const remove = () =>
    confirm(
      "Apagar esta compra?",
      "Ela sai do histórico e dos preços dos produtos. A despesa lançada no Floco, se houver, não é apagada.",
      async () => {
        const ok = await perform((s: any) => removePurchase(s, id), "Compra apagada");
        if (ok) nav.back();
      },
      "Apagar",
    );

  return (
    <>
      <Box>
        <T style={{ fontFamily: "SoraSemi" }}>{displayName(p.marketName) || "Compra manual"}</T>
        {!!p.cnpj && <Muted>{`CNPJ ${formatCnpj(p.cnpj)}`}</Muted>}
        <Muted>{`${brDate(p.date)} · ${p.source === "nfce" ? "nota fiscal" : "registro manual"}`}</Muted>
        <View style={[k.row, { justifyContent: "space-between", marginTop: 8 }]}>
          <Muted>{`${p.items.length} ${p.items.length === 1 ? "item" : "itens"}`}</Muted>
          <T style={{ fontFamily: "SoraSemi", fontVariant: ["tabular-nums"] }}>{show(p.totalCents)}</T>
        </View>
      </Box>

      <Section title="Itens" />
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {p.items.map((i: any, idx: number) => (
          <View key={idx} style={[k.row, idx < p.items.length - 1 && k.hairline, { borderBottomColor: c.line, padding: 12, gap: 8 }]}>
            <View style={{ flex: 1 }}>
              <T numberOfLines={2}>{displayName(i.name)}</T>
              <Muted>{`${String(i.qty).replace(".", ",")}${i.unit ? ` ${i.unit}` : "x"} · ${show(i.unitPriceCents)}${unitSuffix(i.unit)}`}</Muted>
            </View>
            <T style={{ fontVariant: ["tabular-nums"] }}>{show(i.totalCents)}</T>
          </View>
        ))}
      </Box>

      <View style={{ marginTop: 16, gap: 8 }}>
        <Button title="Registrar como despesa" icon="dollar-sign" onPress={() => nav.push({ name: "form", kind: "transaction", initial: expenseDraftFromPurchase(p) })} />
        <Button title="Apagar compra" icon="trash-2" danger secondary onPress={remove} />
      </View>
    </>
  );
}

// Detalhe de um produto: preços, variação, histórico por compra e atalho para a lista.
export function ProductDetailScreen({ id }: { id: string }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const nav = useNav();
  const [added, setAdded] = useState(false);
  const p: any = productsOf(state).find((x: any) => x.id === id);
  if (!p)
    return (
      <>
        <Empty icon="tag" title="Produto não encontrado" body="Ele sai do histórico quando todas as compras dele são apagadas." />
        <Button title="Voltar" secondary onPress={() => nav.back()} />
      </>
    );

  const sum = priceSummary(p);
  const tr = priceTrend(p);
  const pts: any[] = pricePoints(state, p);
  const suffix = unitSuffix(p.unit);
  const cell = (label: string, cents: number | null) => (
    <View key={label} style={{ flexBasis: "47%", flexGrow: 1, gap: 2 }}>
      <Muted>{label}</Muted>
      <T style={{ fontFamily: "SoraSemi", fontVariant: ["tabular-nums"] }}>{cents != null ? `${show(cents)}${suffix}` : "—"}</T>
    </View>
  );

  const addToList = async () => {
    const ok = await perform((s: any) => addShoppingItem(s, displayName(p.name)), "");
    if (ok) setAdded(true);
  };

  return (
    <>
      <Box>
        <T style={{ fontFamily: "SoraSemi" }}>{displayName(p.name)}</T>
        <Muted>{`${p.category} · comprado ${p.buys} ${p.buys === 1 ? "vez" : "vezes"}${p.lastBoughtAt ? `, a última em ${brDate(p.lastBoughtAt)}` : ""}`}</Muted>
      </Box>

      {sum && (
        <Box style={{ gap: 12 }}>
          <View style={[k.row, { flexWrap: "wrap", gap: 12, alignItems: "flex-start" }]}>
            {cell("Último", sum.last)}
            {cell("Médio", sum.avg)}
            {cell("Mínimo", sum.min)}
            {cell("Máximo", sum.max)}
          </View>
          {tr.dir !== "none" && (
            <View accessible accessibilityLabel={tr.dir === "same" ? "Preço igual ao da compra anterior" : `${tr.dir === "up" ? "Subiu" : "Caiu"} ${String(tr.pct).replace(".", ",")} por cento desde a compra anterior`} style={[k.row, { gap: 8 }]}>
              <I name={tr.dir === "up" ? "trending-up" : tr.dir === "down" ? "trending-down" : "minus"} color={tr.dir === "up" ? c.red : tr.dir === "down" ? c.green : c.muted} />
              <T style={{ flex: 1 }}>
                {tr.dir === "same" ? "Igual à compra anterior" : `${tr.dir === "up" ? "Subiu" : "Caiu"} ${String(tr.pct).replace(".", ",")}% desde a compra anterior`}
              </T>
            </View>
          )}
        </Box>
      )}

      <Section title="Histórico de preços" />
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {pts.map((x, i) => (
          <View key={`${x.purchaseId}-${i}`} style={[k.row, i < pts.length - 1 && k.hairline, { borderBottomColor: c.line, padding: 12, gap: 8 }]}>
            <View style={{ flex: 1 }}>
              <T>{brDate(x.date)}</T>
              {!!x.market && <Muted numberOfLines={1}>{displayName(x.market)}</Muted>}
            </View>
            <T style={{ fontVariant: ["tabular-nums"] }}>{`${show(x.priceCents)}${suffix}`}</T>
          </View>
        ))}
      </Box>

      <View style={{ marginTop: 16, gap: 8 }}>
        {added ? (
          <View accessibilityLiveRegion="polite" style={[k.row, { gap: 8 }]}>
            <I name="check-circle" color={c.green} />
            <T style={{ flex: 1 }}>Adicionado à lista de compras</T>
          </View>
        ) : (
          <Button title="Colocar na lista" icon="plus" onPress={() => void addToList()} />
        )}
        <Button title="Ver a lista" secondary onPress={() => nav.push({ name: "shopping" })} />
      </View>
    </>
  );
}

// Seção "Já deve estar acabando" no topo da aba Produtos (some quando não há candidatos).
function RestockSection() {
  const { state } = useStore();
  if (!restockCandidates(state, today(), { limit: 1 }).length) return null;
  return (
    <>
      <Section title="Já deve estar acabando" />
      <RestockList limit={10} />
    </>
  );
}
