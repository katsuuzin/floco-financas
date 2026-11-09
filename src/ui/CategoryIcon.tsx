// Ícone de categoria: a imagem do Kontto pintada sobre a cor da categoria, ou o ícone Feather
// escolhido pela pessoa. Mesmo bloco arredondado em todas as telas.
import React from "react";
import { View, Image } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { onColor } from "../looks.mjs";
import { CATEGORY_IMAGES } from "./categoryImages";

export default function CategoryIcon({ look, size = 38 }: { look: { icon: string; color: string; image?: string }; size?: number }) {
  const ink = onColor(look.color);
  const file = look.image ? CATEGORY_IMAGES[look.image] : null;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: look.color, alignItems: "center", justifyContent: "center" }}
    >
      {file ? (
        <Image source={file} style={{ width: size * 0.58, height: size * 0.58, tintColor: ink }} resizeMode="contain" />
      ) : (
        <Feather name={look.icon as any} size={size * 0.48} color={ink === "#FFFFFF" ? "#FFFFFF" : "#311E0D"} />
      )}
    </View>
  );
}
