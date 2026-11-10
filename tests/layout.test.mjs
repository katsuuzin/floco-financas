import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { layoutOf, moveBlock, orderedBlocks, HOME_BLOCKS, firstSteps } from "../src/layout.mjs";

test("S2 layout padrão inclui todos os blocos com visibilidade padrão", () => {
  const l = layoutOf(emptyState());
  assert.equal(l.home.length, HOME_BLOCKS.length);
  assert.equal(l.home.find((b) => b.id === "insights").visible, false);
  assert.equal(l.tab4, "analysis");
});

test("S2 ordem salva é respeitada e blocos novos entram no fim", () => {
  const saved = [{ id: "recent", visible: true }, { id: "accounts", visible: false }];
  const list = orderedBlocks(HOME_BLOCKS, saved, []);
  assert.deepEqual(list.slice(0, 2).map((b) => b.id), ["recent", "accounts"]);
  assert.equal(list[1].visible, false);
  assert.equal(list.length, HOME_BLOCKS.length);
});

test("S2 mover bloco troca com o vizinho e ignora limites", () => {
  const list = layoutOf(emptyState()).home;
  const up = moveBlock(list, list[1].id, -1);
  assert.equal(up[0].id, list[1].id);
  assert.equal(moveBlock(list, list[0].id, -1), list);
});

test("H2 primeiros passos são derivados dos dados", () => {
  const s = { ...emptyState(), accounts: [{ id: "a" }], settings: { ...emptyState().settings, noCard: true } };
  const f = firstSteps(s);
  assert.equal(f.done, 2);
});
