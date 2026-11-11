// Use makeState({ items, purchases, products }) para montar o estado de teste.
// makePurchase({ id, date, items }) cria compras fictícias com campos sobrescrevíveis.
// makeNota({ items, chave }) simula a saída do leitor NFC-e, sem consultar serviços.
// seededRandom(seed) retorna uma função que gera a mesma sequência para a mesma semente.
import { emptyState } from "../../src/finance.mjs";
import { chaveDv, isChave } from "../../src/nfce.mjs";

const date = "2026-01-01";
const marketName = "Mercado fictício";
const syntheticCnpj = "0".repeat(14);
const first43 = ["35", "2601", syntheticCnpj, "65", "001", "000000001", "1", "12345678"].join("");
const syntheticKey = first43 + chaveDv(first43);

const sampleItem = () => ({
  name: "Arroz fictício", rawName: "ARROZ FICTICIO", qty: 1, unit: "", unitPriceCents: 500, totalCents: 500,
});

export function makeState({ items = [], purchases = [], products = [] } = {}) {
  return {
    ...emptyState(),
    shoppingItems: structuredClone(items),
    shoppingPurchases: structuredClone(purchases),
    shoppingProducts: structuredClone(products),
  };
}

export function makePurchase({ items = [sampleItem()], ...fields } = {}) {
  return {
    id: "compra-ficticia-1", date, marketName, cnpj: "", chave: "", source: "manual",
    transactionId: "", createdAt: Date.parse(date + "T12:00:00Z"),
    totalCents: items.reduce((sum, item) => sum + item.totalCents, 0),
    ...fields,
    items: items.map((item) => ({ productId: "", ...item })),
  };
}

export function makeNota({ items = [sampleItem()], chave = syntheticKey } = {}) {
  if (typeof chave !== "string" || !isChave(chave)) throw Error("Use uma chave fictícia com dígito verificador válido.");
  const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  return {
    marketName, cnpj: chave.slice(6, 20), address: "", items: structuredClone(items), chave,
    itemCount: items.length, totalCents, itemsSumCents: totalCents, totalMatchesItems: true,
    payment: "", issuedDate: date, issuedTime: "12:00:00",
  };
}

export function seededRandom(seed) {
  let value = Number(seed) >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
