import test from "node:test";
import assert from "node:assert/strict";
import { ABBREVIATIONS, expandName } from "../src/nfceNames.mjs";

const cases = [
  ["FARIN TRIGO MARCA 1KG", "Farinha de trigo Marca 1 kg"],
  ["CR LEITE MARCA TP 200G", "Creme de leite Marca 200 g"],
  ["BISC RECH 140G CHOCOLATE", "Biscoito recheado chocolate 140 g"],
  ["MAC OVOS 500G ESPAGUETE", "Macarrão de ovos espaguete 500 g"],
  ["MOL TOM SACH 240G", "Molho de tomate sachê 240 g"],
  ["DETERG LIQ MARCA 500ML", "Detergente líquido Marca 500 ml"],
  ["REFRIG COLA 2L", "Refrigerante cola 2 l"],
  ["LEITE L/VIDA MARCA 1L INTEGRAL", "Leite longa vida Marca 1 l integral"],
  ["FARIN TRIGO MARCA 1kg", "Farinha de trigo Marca 1 kg"],
  ["Farin Trigo CasaMix 1 KG", "Farinha de trigo CasaMix 1 kg"],
  ["farin trigo CasaMix 1kg", "Farinha de trigo CasaMix 1 kg"],
  ["FARIN. TRIGO MARCA 1KG", "Farinha de trigo Marca 1 kg"],
  ["CR LEITE TETRA PAK 200G", "Creme de leite 200 g"],
  ["CR", "CR"],
  ["CR INDEFINIDO 200G", "CR INDEFINIDO 200 g"],
  ["CREMOSO 500G", "Cremoso 500 g"],
  ["DETERGENTE Líquido Marca 500 ml", "DETERGENTE Líquido Marca 500 ml"],
  ["Açúcar mascavo 500 g", "Açúcar mascavo 500 g"],
  ["café em grãos 250 g", "café em grãos 250 g"],
  ["Leite integral 1 l", "Leite integral 1 l"],
  ["Oliva Verde", "Oliva Verde"],
  ["MAC3 500G", "MAC3 500 g"],
  ["PAP HIG 12UN", "Papel higiênico 12"],
  ["PAP TOAL 2 UND", "Papel toalha 2"],
  ["SAB PÓ MARCA 1,5KG", "Sabão em pó Marca 1,5 kg"],
  ["BISC ÁGUA SAL 200 G", "Biscoito de água e sal 200 g"],
  ["CAF NESTLÉ 250G", "Café Nestlé 250 g"],
  ["DESINF LAV 2L", "Desinfetante de lavanda 2 l"],
  ["FGO DESFI 1.2KG", "Frango desfiado 1.2 kg"],
  ["QJ MUSS 500G", "Queijo muçarela 500 g"],
  ["VIN MAÇÃ 750ML", "Vinagre de maçã 750 ml"],
  ["MARG S/SAL 250G", "Margarina sem sal 250 g"],
  ["Óleo 3x900ML", "Óleo 3x900 ml"],
  ["Biscoito recheado chocolate 140 g", "Biscoito recheado chocolate 140 g"],
  ["Shampoo fórmula suave sem perfume para cabelo seco com ingredientes de origem vegetal e embalagem econômica de refil", "Shampoo fórmula suave sem perfume para cabelo seco com ingredientes de origem vegetal e embalagem econômica de refil"],
  ["", ""],
  ["  \n ", ""],
  [null, ""],
  [undefined, ""],
  [33, ""],
  ["MOL TOM HEINZ SACH 240G TRADICIONAL", "Molho de tomate Heinz sachê 240 g tradicional"],
  ["BISC NESTLE RECH 140G MOCA", "Biscoito Nestlé recheado 140 g moca"],
  ["FAROFA YOKI 400G MANDIOCA TEMP TRAD", "Farofa Yoki 400 g mandioca temperada tradicional"],
  ["MAC CAMIL OVOS 500G ESPAGUETE", "Macarrão Camil de ovos 500 g espaguete"],
  ["MAC RENATA INT 500G", "Macarrão Renata integral 500 g"],
  ["FGO SEARA COZ TEMP 1KG", "Frango Seara cozido temperado 1 kg"],
  ["CAF PILÃO TRAD 500G", "Café pilão tradicional 500 g"],
  ["FARIN TRIGO DONA BENTA 1KG", "Farinha de trigo Dona Benta 1 kg"],
  ["LEITE ITAMBE DESN 1L", "Leite Itambé desnatado 1 l"],
  ["LEITE TIROL SEMI 1L", "Leite Tirol semidesnatado 1 l"],
  ["LEITE MOCA COND 395G", "Leite moca condensado 395 g"],
  ["BAT PRE COZ 500G", "Batata pré cozida 500 g"],
  ["CASTANHAS MAGGI TRIT 150G", "Castanhas Maggi trituradas 150 g"],
  ["MOL TOM QUERO PICANT 240G", "Molho de tomate Quero picante 240 g"],
  ["PRES SADIA FAT 200G", "Presunto Sadia fatiado 200 g"],
  ["QJ TIROL FATIA 200G", "Queijo Tirol fatia 200 g"],
  ["BISC BAUDUCCO 2PCT", "Biscoito Bauducco 2 pacote"],
  ["ACHOC NINHO 2 CX", "Achocolatado Ninho 2 caixa"],
  ["QJ VIGOR 1UNID", "Queijo Vigor 1 unidade"],
  ["REFRIG GUARANA ANTARCTICA 2L", "Refrigerante Guaraná Antarctica 2 l"],
  ["MAION HELLMANN'S TRAD 500G", "Maionese Hellmann's tradicional 500 g"],
  ["FAROFA YOKI Receita 400g", "Farofa Yoki receita 400 g"],
];

for (const [input, expected] of cases) {
  test(`Nome de NFC-e: ${JSON.stringify(input)}`, () => {
    const result = expandName(input);
    assert.equal(result, expected);
    assert.equal(expandName(result), result);
  });
}

test("O dicionário público tem pelo menos 80 abreviações", () => {
  assert.ok(Object.keys(ABBREVIATIONS).length >= 80);
  assert.equal(ABBREVIATIONS["farin trigo"], "farinha de trigo");
});
