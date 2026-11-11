import test from "node:test";
import assert from "node:assert/strict";
import * as hardened from "../src/hardened.mjs";
import { makeNota, makeState } from "./helpers/shoppingFixtures.mjs";

const key = makeNota().chave;
const wrong = key.slice(0, -1) + (Number(key.at(-1)) + 1) % 10;
const url = "https://nfce.fazenda.sp.gov.br/qrcode";
const qr = url + "?p=" + key + "|3|1";
const cases = {
  "IsIsoDate": [
    [
      "2026-02-30",
      false
    ],
    [
      "2024-02-29",
      true
    ],
    [
      "2025-02-29",
      false
    ],
    [
      "1900-02-29",
      false
    ],
    [
      "2000-02-29",
      true
    ],
    [
      "2026-04-31",
      false
    ],
    [
      "2026-01-01",
      true
    ],
    [
      "2026-12-31",
      true
    ],
    [
      "2026-00-01",
      false
    ],
    [
      "2026-01-01\n",
      false
    ],
    [
      null,
      false
    ]
  ],
  "CentsFromBr": [
    [
      "-1,00",
      null
    ],
    [
      "1.234,56",
      123456
    ],
    [
      "1234,56",
      123456
    ],
    [
      "1,234.56",
      null
    ],
    [
      "1e3",
      null
    ],
    [
      "12.34",
      null
    ],
    [
      "0",
      0
    ],
    [
      "  R$ 12,5 ",
      1250
    ],
    [
      "1.234.567",
      123456700
    ],
    [
      "90071992547409,91",
      9007199254740991
    ],
    [
      "90071992547409,92",
      null
    ]
  ],
  "Sum": [
    [
      [
        1,
        2
      ],
      3
    ],
    [
      [],
      0
    ],
    [
      [
        0
      ],
      0
    ],
    [
      [
        1,
        null
      ],
      null
    ],
    [
      [
        1,
        "2"
      ],
      null
    ],
    [
      [
        1.1
      ],
      null
    ],
    [
      [
        9007199254740991,
        2
      ],
      null
    ],
    [
      [
        -9007199254740991,
        -2
      ],
      null
    ],
    [
      [
        9007199254740991,
        -1
      ],
      9007199254740990
    ],
    [
      [
        9007199254740991,
        1,
        -1
      ],
      9007199254740991
    ],
    [
      null,
      null
    ]
  ],
  "ProductKey": [
    [
      [
        "Produto 1,5"
      ],
      "produto 1,5|"
    ],
    [
      [
        "Produto 1 5"
      ],
      "produto 1 5|"
    ],
    [
      [
        "Produto 1.5"
      ],
      "produto 1,5|"
    ],
    [
      [
        "Água",
        "l"
      ],
      "agua|l"
    ],
    [
      [
        "Água",
        "ml"
      ],
      "agua|ml"
    ],
    [
      [
        "抹茶"
      ],
      "抹茶|"
    ],
    [
      [
        "  Pão   doce  "
      ],
      "pao doce|"
    ],
    [
      [
        "sal fino!"
      ],
      "sal fino|"
    ],
    [
      [
        "1,25 kg"
      ],
      "1,25 kg|"
    ],
    [
      [
        ""
      ],
      "|"
    ]
  ]
};
for (const [name, rows] of Object.entries(cases)) {
  rows.forEach(([input, expected], i) => test(name + " · caso " + (i + 1), () => {
    assert.equal(hardened["safe" + name](...(name === "ProductKey" ? input : [input])), expected);
  }));
}

const keys = [key, wrong, " " + key, key + "\n", key.slice(1), key + "0", null, 123, {}, { toString: () => key }, key.replace(/^./, "A")];
keys.forEach((value, i) => test("Chave fiscal · caso " + (i + 1), () => assert.equal(hardened.safeIsChave(value), i === 0)));

const map = { SP: "host", PR: null, SC: undefined };
const ufCases = [[map, "SP", true], [map, "PR", true], [map, "SC", true], [map, "sp", false],
  [map, "toString", false], [map, "constructor", false], [map, "RS", false], [null, "SP", false],
  [Object.create(map), "SP", false], [Object.create(null), "__proto__", false], [map, 35, false]];
ufCases.forEach(([source, uf, expected], i) => test("UF · caso " + (i + 1), () => assert.equal(hardened.safeHasUf(source, uf), expected)));

const inputCases = [[key, "chave"], [key.slice(0, 4) + " " + key.slice(4), "chave"], [qr, "qr"],
  [url + "?chNFe=" + key, "qr"], [qr + "&p=" + key], [qr + "&%70=" + wrong], [url + "?p=&p=" + key],
  [wrong], [""], [null], ["x".repeat(2001)], ["https://exemplo.invalid?p=" + key]];
inputCases.forEach(([input, source], i) => test("Entrada da NFC-e · caso " + (i + 1), () => {
  if (source) assert.equal(hardened.safeParseNfceInput(input).source, source);
  else assert.throws(() => hardened.safeParseNfceInput(input), /[a-z]/i);
}));

const lineCases = [[100, 2, "", 200], [200, 0.5, "kg", 200], [null, 1, "", null], [0, 1, "", 0],
  [-1, 1, "", null], [100, -1, "", null], [100, 0, "", null], [Number.MAX_SAFE_INTEGER, 100, "", null],
  [Number.MAX_SAFE_INTEGER, 1, "", Number.MAX_SAFE_INTEGER], [1, 0.5, "", null], ["100", 1, "", null]];
lineCases.forEach(([priceCents, qty, unit, expected], i) => test("Total da linha · caso " + (i + 1), () => {
  const state = makeState({ items: [{ priceCents, qty, unit }] });
  assert.equal(hardened.safeLineTotal(state.shoppingItems[0]), expected);
}));

const trendCases = [[[100, 200], "up", 100], [[200, 100], "down", 50], [[100, 100], "same", 0],
  [[0, 100], "none", 0], [[100, 0], "down", 100], [[], "none", 0], [[100], "none", 0],
  [[-1, 100], "none", 0], [[NaN, 100], "none", 0], [[100, 125], "up", 25]];
trendCases.forEach(([prices, dir, pct], i) => test("Tendência · caso " + (i + 1), () => {
  const state = makeState({ products: [{ prices: prices.map((priceCents) => ({ date: "2026-01-01", priceCents })) }] });
  const trend = hardened.safePriceTrend(state.shoppingProducts[0]);
  assert.equal(trend.dir, dir);
  assert.equal(trend.pct, pct);
}));
