import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as Application from "expo-application";
export default function UpdatesPanel({ c, onBack, updates: u }: any) {
  const text = (children: any, style: any = {}, rest: any = {}) => (
    <Text
      {...rest}
      style={[
        { fontFamily: "Sora", fontSize: 15, lineHeight: 23, color: c.text },
        style,
      ]}
    >
      {children}
    </Text>
  );
  const button = (
    title: string,
    action: any,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!u.busy || disabled }}
      disabled={!!u.busy || disabled}
      onPress={action}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? c.soft : c.primary,
        opacity: u.busy || disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {text(title, {
        fontFamily: "SoraSemi",
        color: secondary ? c.text : c.onPrimary,
      })}
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          padding: 16,
          borderBottomWidth: 1,
          borderColor: c.line,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={{ minHeight: 48, justifyContent: "center", padding: 8 }}
        >
          {text("Voltar")}
        </Pressable>
        {text("Atualizações", { fontSize: 21, fontFamily: "SoraBold" })}
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
          gap: 18,
          maxWidth: 700,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {text("Seu Floco sempre em dia.", {
          fontSize: 24,
          lineHeight: 32,
          fontFamily: "SoraBold",
        })}
        {text(
          `Versão instalada ${u.version} (${Application.nativeBuildVersion}). Atualizações públicas pelo GitHub, sem login e sem token.`,
          { color: c.muted },
        )}
        <View
          style={{
            padding: 20,
            borderRadius: 18,
            backgroundColor: c.surface,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {text("Verificar automaticamente", {
              flex: 1,
              fontFamily: "SoraSemi",
            })}
            <Switch
              accessibilityLabel="Verificar atualizações automaticamente"
              value={u.autoCheck}
              onValueChange={u.setAutomatic}
              disabled={!u.ready}
              trackColor={{ false: c.line, true: c.primary }}
              thumbColor={u.autoCheck ? c.accent : c.muted}
            />
          </View>
          {text(
            "Verifica ao abrir, ao voltar ao aplicativo e a cada 15 minutos enquanto ele estiver aberto. Uma nova versão aparece em um aviso no Floco.",
            { color: c.muted, fontSize: 13 },
          )}
          {text(
            u.lastCheck
              ? `Última verificação: ${new Date(u.lastCheck).toLocaleString("pt-BR")}`
              : "Ainda não foi possível concluir uma verificação.",
            { color: c.muted, fontSize: 13 },
          )}
          {button(
            "Verificar atualizações",
            () => u.check(false),
            true,
            !u.ready,
          )}
        </View>
        {!!u.busy && (
          <View accessibilityRole="alert" style={{ gap: 10 }}>
            <ActivityIndicator color={c.primary} />
            {text(
              u.busy + (u.busy.startsWith("Baixando") ? ` ${u.progress}%` : ""),
              { textAlign: "center" },
            )}
          </View>
        )}
        {!!u.error &&
          text(u.error, { color: c.red }, { accessibilityRole: "alert" })}
        {!!u.message &&
          text(u.message, { color: c.text }, { accessibilityRole: "alert" })}
        {u.release && (
          <View
            style={{
              padding: 20,
              borderRadius: 18,
              backgroundColor: c.surface,
              gap: 16,
            }}
          >
            {text(`Nova versão ${u.release.version}`, {
              fontFamily: "SoraBold",
              fontSize: 21,
            })}
            {text(`${(u.release.size / 1024 / 1024).toFixed(1)} MB · Android`, {
              color: c.muted,
            })}
            {button(
              u.downloaded === u.release.sha256
                ? "Instalar atualização"
                : "Atualizar aplicativo",
              u.update,
            )}
            {text(
              "Baixa o APK, verifica tamanho, SHA-256, aplicativo, assinatura e versão, e abre o instalador. O Android pode pedir “Permitir desta fonte” e sua confirmação para instalar.",
              { color: c.muted, fontSize: 13 },
            )}
            {text(u.release.notes)}
          </View>
        )}
        {text(
          "As consultas enviam ao GitHub apenas os pedidos de versão e download. Seus registros financeiros ficam no aparelho. A verificação não roda quando o app está fechado; não há instalação silenciosa nesta versão.",
          { color: c.muted, fontSize: 13 },
        )}
      </ScrollView>
    </View>
  );
}
