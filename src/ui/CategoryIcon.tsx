// Ícone de categoria no padrão do Calen: bloco suave na cor da categoria com o ícone de três
// tons por cima (claro e escuro). `solid` pinta o bloco cheio com o ícone branco (balões da
// rosca). Escolha antiga em Feather continua aparecendo como Feather.
import React, { useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import Feather from "@expo/vector-icons/Feather";
import { calenSvg, calenTones } from "../calenArt.mjs";
import { useTheme } from "./theme";
import { ALLOWED_ICONS, defaultStyleFor, readableOn, sanitizeStyle } from "../categoryStyle.mjs";
import { CALEN_PREFIX, ICONS, isCalenChoice, lookOf } from "../looks.mjs";
import { hasCalenIcon } from "../calenArt.mjs";

export function categoryStyleOf(state: any, name: string): { icon: string; color: string; image?: string } {
  const styles = state.categoryLooks ?? {};
  if (!Object.hasOwn(styles, name)) return sanitizeStyle(defaultStyleFor(name));
  const style = styles[name];
  if (!ALLOWED_ICONS.includes(style?.icon) && (ICONS.includes(style?.icon) ||
      isCalenChoice(style?.icon) && hasCalenIcon(style.icon.slice(CALEN_PREFIX.length)))) return lookOf(state, name);
  return sanitizeStyle(style);
}

export function tagStyleOf(tag: any) {
  const preset = defaultStyleFor(tag?.name);
  return sanitizeStyle({ icon: tag?.icon ?? preset.icon, color: tag?.color ?? preset.color });
}

export default function CategoryIcon({ look, size = 38, solid = false }: { look: { icon: string; color: string; image?: string }; size?: number; solid?: boolean }) {
  const { dark } = useTheme();
  const tones = useMemo(() => calenTones(look.color, dark, solid), [look.color, dark, solid]);
  const xml = useMemo(() => (look.image ? calenSvg(look.image, look.color, dark, solid) : ""), [look.image, look.color, dark, solid]);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: tones.box, alignItems: "center", justifyContent: "center" }}
    >
      {xml ? (
        <SvgXml xml={xml} width={size * 0.66} height={size * 0.66} />
      ) : (
        <Feather name={look.icon as any} size={size * 0.48} color={solid ? readableOn(look.color) : look.color} />
      )}
    </View>
  );
}
