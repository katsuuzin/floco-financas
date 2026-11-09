// Ícone do banco (mesmo arquivo do Kontto); sem ícone, selo com cor da marca e sigla.
import React from "react";
import { View, Text, Image } from "react-native";
import { bankLook } from "../bankCatalog.mjs";
import { BANK_LOGO_FILES } from "./bankLogos";

export default function BankBadge({ name, alt, size = 38 }: { name?: string; alt?: string; size?: number }) {
  const look = bankLook(name, alt);
  const radius = size * 0.28;
  const file = look.logo ? BANK_LOGO_FILES[look.logo] : null;
  if (file) {
    return (
      <Image
        source={file}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: look.bg, alignItems: "center", justifyContent: "center" }}
    >
      <Text allowFontScaling={false} style={{ color: look.fg, fontFamily: "SoraBold", fontSize: size * (look.abbr.length > 2 ? 0.3 : 0.4), includeFontPadding: false }}>
        {look.abbr}
      </Text>
    </View>
  );
}
