import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRepository,
  newerVersion,
  selectRelease,
} from "../src/updates.mjs";
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
