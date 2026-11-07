import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRepository,
  newerVersion,
  selectRelease,
  checkRelease,
  shouldAutoCheck,
  AUTO_CHECK_INTERVAL,
} from "../src/updates.mjs";
test("consulta pública funciona sem credencial e nunca envia Authorization", async () => {
  let requested;
  const response = {
    tag_name: "v1.1.1",
    assets: [
      {
        id: 1,
        name: "Floco-Financas.apk",
        size: 100,
        digest: "sha256:" + "a".repeat(64),
      },
    ],
  };
  const next = await checkRelease(
    "katsuuzin/floco-financas",
    "1.1.0",
    async (url, options) => {
      requested = { url, options };
      return { ok: true, status: 200, json: async () => response };
    },
  );
  assert.equal(next.version, "v1.1.1");
  assert.equal(requested.options.headers.Authorization, undefined);
  assert.equal(
    requested.url,
    "https://api.github.com/repos/katsuuzin/floco-financas/releases/latest",
  );
  await assert.rejects(
    () =>
      checkRelease("katsuuzin/floco-financas", "1.1.0", async () => ({
        ok: false,
        status: 403,
      })),
    /limitou/,
  );
  await assert.rejects(
    () =>
      checkRelease("katsuuzin/floco-financas", "1.1.0", async () => ({
        ok: false,
        status: 404,
      })),
    /pública/,
  );
});
test("verificação automática respeita intervalo e recupera mudança do relógio", () => {
  const now = 10000000;
  assert.equal(shouldAutoCheck(0, now), true);
  assert.equal(shouldAutoCheck(now - 1000, now), false);
  assert.equal(shouldAutoCheck(now - AUTO_CHECK_INTERVAL, now), true);
  assert.equal(shouldAutoCheck(now + 1000, now), true);
});
test("repositório aceita somente owner/repo e impede injeção de caminho", () => {
  assert.equal(
    normalizeRepository("https://github.com/kat/floco.git"),
    "kat/floco",
  );
  for (const repo of [
    "../../x",
    "kat/floco/../../x",
    "evil.com/x/y",
    "kat/floco?secret=x",
  ])
    assert.throws(() => normalizeRepository(repo));
});
test("versões semânticas numéricas não confundem 1.10 com 1.9", () => {
  assert.ok(newerVersion("v1.10.0", "1.9.9"));
  assert.equal(newerVersion("v1.0.0", "1.0.0"), false);
  assert.equal(newerVersion("v0.9.9", "1.0.0"), false);
  assert.throws(() => newerVersion("v1.1.0-beta", "1.0.0"));
});
test("release exige APK com hash e tamanho válidos", () => {
  const release = {
    tag_name: "v1.1.0",
    assets: [
      {
        id: 1,
        name: "Floco-Financas.apk",
        size: 100,
        digest: "sha256:" + "a".repeat(64),
      },
    ],
  };
  assert.equal(selectRelease(release, "1.0.0").assetId, 1);
  assert.equal(selectRelease(release, "1.1.0"), null);
  assert.throws(() => selectRelease({ ...release, prerelease: true }, "1.0.0"));
  assert.throws(() =>
    selectRelease(
      { ...release, assets: [{ ...release.assets[0], digest: null }] },
      "1.0.0",
    ),
  );
  assert.throws(() =>
    selectRelease(
      {
        ...release,
        assets: [{ ...release.assets[0], size: 300 * 1024 * 1024 }],
      },
      "1.0.0",
    ),
  );
});
