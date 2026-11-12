/*
Ícones adaptados de https://github.com/lucide-icons/lucide/tree/main/icons
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

O ícone shopping-bag também deriva de Feather e conserva o aviso MIT:

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { View } from "react-native";
import { useTheme } from "./theme";
import { categoryTone } from "../tones.mjs";

const CATEGORY_ART = {
  "Hortifrúti": ( // carrot
    <>
      <Path d="M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3" />
      <Path d="M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7" />
      <Path d="m8 15-2.58-2.58" />
    </>
  ),
  "Carnes e peixes": ( // fish
    <>
      <Path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
      <Path d="M18 12v.5" />
      <Path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
      <Path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
      <Path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" />
      <Path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />
    </>
  ),
  "Frios e laticínios": ( // milk
    <>
      <Path d="M8 2h8" />
      <Path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" />
      <Path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
    </>
  ),
  "Padaria": ( // sandwich
    <>
      <Path d="m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777" />
      <Path d="M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25" />
      <Path d="M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9" />
      <Path d="m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" />
      <Rect width="20" height="4" x="2" y="11" rx="1" />
    </>
  ),
  "Mercearia": ( // wheat
    <>
      <Path d="M2 22 16 8" />
      <Path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <Path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <Path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <Path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      <Path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <Path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <Path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
    </>
  ),
  "Bebidas": ( // cup-soda
    <>
      <Path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" />
      <Path d="M5 8h14" />
      <Path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
      <Path d="m12 8 1-6h2" />
    </>
  ),
  "Congelados": ( // snowflake
    <>
      <Path d="m10 20-1.25-2.5L6 18" />
      <Path d="M10 4 8.75 6.5 6 6" />
      <Path d="m14 20 1.25-2.5L18 18" />
      <Path d="m14 4 1.25 2.5L18 6" />
      <Path d="m17 21-3-6h-4" />
      <Path d="m17 3-3 6 1.5 3" />
      <Path d="M2 12h6.5L10 9" />
      <Path d="m20 10-1.5 2 1.5 2" />
      <Path d="M22 12h-6.5L14 15" />
      <Path d="m4 10 1.5 2L4 14" />
      <Path d="m7 21 3-6-1.5-3" />
      <Path d="m7 3 3 6h4" />
    </>
  ),
  "Limpeza": ( // spray-can
    <>
      <Path d="M3 3h.01" />
      <Path d="M7 5h.01" />
      <Path d="M11 7h.01" />
      <Path d="M3 7h.01" />
      <Path d="M7 9h.01" />
      <Path d="M3 11h.01" />
      <Rect width="4" height="4" x="15" y="5" />
      <Path d="m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2" />
      <Path d="m13 14 8-2" />
      <Path d="m13 19 8-2" />
    </>
  ),
  "Higiene": ( // bath
    <>
      <Path d="M10 4 8 6" />
      <Path d="M17 19v2" />
      <Path d="M2 12h20" />
      <Path d="M7 19v2" />
      <Path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </>
  ),
  "Pet": ( // paw-print
    <>
      <Circle cx="11" cy="4" r="2" />
      <Circle cx="18" cy="8" r="2" />
      <Circle cx="20" cy="16" r="2" />
      <Path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </>
  ),
  "Frutas": ( // apple
    <>
      <Path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <Path d="M10 2c1 .5 2 2 2 5" />
    </>
  ),
  "Matinais": ( // coffee
    <>
      <Path d="M10 2v2" />
      <Path d="M14 2v2" />
      <Path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
      <Path d="M6 2v2" />
    </>
  ),
  "Doces e lanches": ( // cookie
    <>
      <Path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <Path d="M8.5 8.5v.01" />
      <Path d="M16 15.5v.01" />
      <Path d="M12 12v.01" />
      <Path d="M11 17v.01" />
      <Path d="M7 14v.01" />
    </>
  ),
  "Bebidas alcoólicas": ( // wine
    <>
      <Path d="M8 22h8" />
      <Path d="M7 10h10" />
      <Path d="M12 15v7" />
      <Path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
    </>
  ),
  "Farmácia": ( // pill
    <>
      <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <Path d="m8.5 8.5 7 7" />
    </>
  ),
  "Bebê": ( // baby
    <>
      <Path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <Path d="M15 12h.01" />
      <Path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
      <Path d="M9 12h.01" />
    </>
  ),
  "Casa e utilidades": ( // house
    <>
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  "Para outra compra": ( // clock
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </>
  ),
  "Outros": ( // shopping-bag
    <>
      <Path d="M16 10a4 4 0 0 1-8 0" />
      <Path d="M3.103 6.034h17.794" />
      <Path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />
    </>
  ),
  "No carrinho": ( // shopping-cart
    <>
      <Path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" />
      <Path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" />
      <Circle cx="18" cy="20" r="2" />
      <Circle cx="8" cy="20" r="2" />
    </>
  ),
};

export type ShoppingCategory = keyof typeof CATEGORY_ART;

// O texto da categoria no componente pai já fornece o nome acessível.
export default function CategoryIcon({ category, size = 22, color }: {
  category: string;
  size?: number;
  color?: string;
}): React.JSX.Element {
  const { c } = useTheme();
  const art = Object.prototype.hasOwnProperty.call(CATEGORY_ART, category)
    ? CATEGORY_ART[category as ShoppingCategory]
    : CATEGORY_ART.Outros;
  return (
    <Svg
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? c.muted}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art}
    </Svg>
  );
}

// Ícone da categoria num círculo colorido (estilo dos itens; tons próprios do Floco em tones.mjs).
// Decorativo: o nome da categoria vem do texto ao lado.
export function CategoryBadge({ category, size = 36 }: { category: string; size?: number }): React.JSX.Element {
  const { dark } = useTheme();
  const tone = categoryTone(category, dark);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}>
      <CategoryIcon category={category} size={Math.round(size * 0.56)} color={tone.fg} />
    </View>
  );
}
