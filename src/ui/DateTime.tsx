// Campos de data e hora (1.14): um toque no campo abre um calendário ou um relógio numa folha; o lápis ao lado
// troca para digitar com máscara (DD/MM/AAAA e HH:MM). O valor do formulário não muda de formato:
// a data continua "AAAA-MM-DD" e a hora "HH:MM" (enquanto incompleto, devolve o texto digitado, e a validação do formulário recusa).
import React, { useEffect, useRef, useState } from "react";
import { Animated as RNAnimated, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { Button, I, IconButton, Muted, T, space, styles as k, type TextControl } from "./kit";
import { SheetModal } from "./Sheet";
import { useTheme } from "./theme";
import { useShake } from "./motion";
import { brDate, maskBrDate, parseBrDate } from "../dates.mjs";
import { maskTime, monthWeeks, parseTime, shiftMonth } from "../timeInput.mjs";
import { today } from "../finance.mjs";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEK = [["D", "domingo"], ["S", "segunda"], ["T", "terça"], ["Q", "quarta"], ["Q", "quinta"], ["S", "sexta"], ["S", "sábado"]];
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
};

// Linha do campo: mostra o valor num botão grande (abre o seletor) ou, no modo "digitar", um campo com máscara.
function PickerShell({ label, hint, error, icon, shown, placeholder, typing, setTyping, onOpen, input, openLabel, typeLabel }: {
  label: string; hint?: string; error?: string; icon: "calendar" | "clock"; shown: string; placeholder: string;
  typing: boolean; setTyping: (v: boolean) => void; onOpen: () => void; input: React.ReactNode; openLabel: string; typeLabel: string;
}) {
  const { c } = useTheme();
  const shake = useShake(error);
  return (
    <View style={{ gap: 8 }}>
      <T style={k.label}>{label}</T>
      <RNAnimated.View
        style={[s.shell, { backgroundColor: c.surface, borderColor: error ? c.red : c.muted }, { transform: [{ translateX: shake }] }]}
      >
        {typing ? input : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${shown || "não definida"}`}
            accessibilityHint={openLabel}
            onPress={onOpen}
            android_ripple={{ color: c.soft }}
            style={s.open}
          >
            <I name={icon} size={18} color={c.muted} />
            <T numberOfLines={1} style={{ flex: 1, fontFamily: "Sora", fontSize: 15, color: shown ? c.text : c.muted }}>{shown || placeholder}</T>
          </Pressable>
        )}
        <IconButton name={typing ? icon : "edit-2"} label={typing ? openLabel : typeLabel} color={c.muted}
          onPress={() => (typing ? (setTyping(false), onOpen()) : setTyping(true))} />
      </RNAnimated.View>
      {!!hint && !error && <Muted>{hint}</Muted>}
      {!!error && <T accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</T>}
    </View>
  );
}

export function DateField({ label, value, onChange, hint, optional = false, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  optional?: boolean;
  error?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(brDate(value || ""));
  // Mudança de fora (atalhos, "Hoje", editar outro item) atualiza o texto; a digitação em andamento não é sobrescrita.
  useEffect(() => {
    if (value && parseBrDate(text) !== value) setText(brDate(value));
    if (!value && text && parseBrDate(text)) setText("");
  }, [value]);
  return (
    <>
      <PickerShell
        label={label}
        hint={hint ?? (optional ? "Opcional." : undefined)}
        error={error}
        icon="calendar"
        shown={brDate(value || "")}
        placeholder="Escolher a data"
        typing={typing}
        setTyping={setTyping}
        onOpen={() => setOpen(true)}
        openLabel="Abre o calendário"
        typeLabel={`Digitar ${label.toLowerCase()}`}
        input={
          <TextInput
            autoFocus
            selectTextOnFocus
            accessibilityLabel={`${label}, digite dia, mês e ano`}
            selectionColor={c.accent}
            cursorColor={c.accent}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={c.muted}
            value={text}
            onBlur={() => setTyping(false)}
            onChangeText={(raw) => {
              const masked = maskBrDate(raw);
              setText(masked);
              const iso = parseBrDate(masked);
              onChange(masked.length === 10 && iso ? iso : masked);
            }}
            style={[s.typed, { color: c.text }]}
          />
        }
      />
      {open && (
        <CalendarSheet
          title={label}
          value={parseBrDate(value || "")}
          optional={optional}
          onPick={(iso) => { setOpen(false); setText(brDate(iso)); onChange(iso); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Calendário em folha: um toque no dia escolhe e fecha. Setas mudam o mês; tocar no mês e ano abre a lista de anos.
export function CalendarSheet({ title, value, optional, onPick, onClose }: {
  title: string; value: string; optional?: boolean; onPick: (iso: string) => void; onClose: () => void;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const now = today();
  const base = value || now;
  const [view, setView] = useState({ year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) });
  const [years, setYears] = useState(false);
  const [page, setPage] = useState(Math.floor(view.year / 12) * 12);
  const go = (count: number) => setView((v) => shiftMonth(v.year, v.month, count));
  const weeks: (string | null)[][] = monthWeeks(view.year, view.month);
  while (weeks.length < 6) weeks.push(Array.from({ length: 7 }, () => null)); // altura fixa: a folha não pula entre meses
  return (
    <SheetModal title={title} onClose={onClose}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md }}>
        {optional && !!value && (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar a data" onPress={() => onPick("")}
            android_ripple={{ color: c.soft }} style={[s.chip, { alignSelf: "flex-start", backgroundColor: c.soft }]}>
            <T style={{ fontFamily: "SoraSemi", fontSize: 13, color: c.primary }}>Limpar a data</T>
          </Pressable>
        )}
        <View style={s.monthBar}>
          <IconButton name="chevron-left" label={years ? "Anos anteriores" : "Mês anterior"} onPress={() => (years ? setPage(page - 12) : go(-1))} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${MONTHS[view.month - 1]} de ${view.year}. Tocar escolhe o ano`}
            accessibilityState={{ expanded: years }} onPress={() => { setPage(Math.floor(view.year / 12) * 12); setYears(!years); }}
            style={s.monthTitle}>
            <T style={{ fontFamily: "SoraSemi", fontSize: 17 }}>{years ? `${page} – ${page + 11}` : `${cap(MONTHS[view.month - 1])} de ${view.year}`}</T>
            <I name={years ? "chevron-up" : "chevron-down"} size={18} color={c.muted} />
          </Pressable>
          <IconButton name="chevron-right" label={years ? "Próximos anos" : "Próximo mês"} onPress={() => (years ? setPage(page + 12) : go(1))} />
        </View>
        {years ? (
          <Animated.View key={`y${page}`} entering={reduce ? undefined : FadeIn.duration(150)} style={[s.years, s.body]}>
            {Array.from({ length: 12 }, (_, i) => page + i).map((year) => (
              <Pressable key={year} accessibilityRole="button" accessibilityLabel={`Ano ${year}`}
                accessibilityState={{ selected: year === view.year }}
                onPress={() => { setView({ ...view, year }); setYears(false); }}
                android_ripple={{ color: c.soft }}
                style={[s.year, { backgroundColor: year === view.year ? c.primary : c.soft }]}>
                <T style={{ fontFamily: "SoraSemi", color: year === view.year ? c.onPrimary : c.text }}>{year}</T>
              </Pressable>
            ))}
          </Animated.View>
        ) : (
          <Animated.View key={`${view.year}-${view.month}`} entering={reduce ? undefined : FadeIn.duration(150)} style={[{ gap: 4 }, s.body]}>
            <View style={s.week}>
              {WEEK.map(([letter, name], i) => (
                <View key={i} style={s.cell} accessible accessibilityLabel={name}>
                  <Muted style={{ fontFamily: "SoraSemi" }}>{letter}</Muted>
                </View>
              ))}
            </View>
            {weeks.map((week: (string | null)[], row: number) => (
              <View key={row} style={s.week}>
                {week.map((iso, col) => {
                  if (!iso) return <View key={col} style={s.cell} />;
                  const picked = iso === value;
                  const isToday = iso === now;
                  return (
                    <Pressable key={col} accessibilityRole="button" accessibilityLabel={`${longDate(iso)}${isToday ? ", hoje" : ""}`}
                      accessibilityState={{ selected: picked }} onPress={() => onPick(iso)} style={s.cell}>
                      <View style={[s.day, picked && { backgroundColor: c.primary }, !picked && isToday && { borderWidth: 1.5, borderColor: c.primary }]}>
                        <T style={{ fontFamily: picked || isToday ? "SoraBold" : "Sora", fontSize: 15, color: picked ? c.onPrimary : c.text }}>{Number(iso.slice(8))}</T>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </SheetModal>
  );
}

export function TimeField({ label = "Hora", value, onChange, hint, optional = true, error }: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  optional?: boolean;
  error?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  return (
    <>
      <PickerShell
        label={label}
        hint={hint}
        error={error}
        icon="clock"
        shown={value}
        placeholder="HH:MM"
        typing={typing}
        setTyping={setTyping}
        onOpen={() => setOpen(true)}
        openLabel="Abre o relógio"
        typeLabel={`Digitar ${label.toLowerCase()}`}
        input={
          <TextInput
            autoFocus
            selectTextOnFocus
            accessibilityLabel={`${label}, digite horas e minutos`}
            selectionColor={c.accent}
            cursorColor={c.accent}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="HH:MM"
            placeholderTextColor={c.muted}
            value={value}
            onBlur={() => setTyping(false)}
            onChangeText={(raw) => onChange(maskTime(raw))}
            style={[s.typed, { color: c.text }]}
          />
        }
      />
      {open && (
        <ClockSheet
          title={label}
          value={parseTime(value)}
          optional={optional}
          onPick={(time) => { setOpen(false); onChange(time); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const DIAL = 264;
const R = DIAL / 2;
const OUTER = R - 26; // raio dos números externos
const INNER = R - 80; // raio dos números internos (13–00)

// Relógio em folha: primeiro as horas (anel de fora 1–12, anel de dentro 13–00), depois os minutos.
// Tocar ou arrastar escolhe; as horas avançam sozinhas para os minutos. Cada parte do topo também aceita "aumentar/diminuir"
// por leitor de tela.
export function ClockSheet({ title, value, optional, onPick, onClose }: {
  title: string; value: string; optional?: boolean; onPick: (time: string) => void; onClose: () => void;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const now = new Date();
  const start = value || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [hour, setHour] = useState(Number(start.slice(0, 2)));
  const [minute, setMinute] = useState(Number(start.slice(3, 5)));
  const [stage, setStage] = useState<"hour" | "minute">("hour");
  const pad = (n: number) => String(n).padStart(2, "0");

  const pointAt = (x: number, y: number) => {
    const dx = x - R;
    const dy = y - R;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return { angle: (angle + 360) % 360, dist: Math.hypot(dx, dy) };
  };
  const touch = (x: number, y: number, last: boolean) => {
    const { angle, dist } = pointAt(x, y);
    if (stage === "hour") {
      const slot = Math.round(angle / 30) % 12; // 0 = topo
      const inner = dist < (OUTER + INNER) / 2;
      setHour(inner ? (slot === 0 ? 0 : slot + 12) : slot === 0 ? 12 : slot);
      if (last) setStage("minute");
    } else {
      setMinute(Math.round(angle / 6) % 60);
    }
  };
  const step = (what: "hour" | "minute", by: number) =>
    what === "hour" ? setHour((h) => (h + by + 24) % 24) : setMinute((m) => (m + by + 60) % 60);

  // Posição da ponta do ponteiro.
  const hourSlot = hour % 12;
  const isInner = hour === 0 || hour > 12;
  const radius = stage === "hour" ? (isInner ? INNER : OUTER) : OUTER;
  const deg = stage === "hour" ? hourSlot * 30 : minute * 6;
  const tipX = R + radius * Math.sin((deg * Math.PI) / 180);
  const tipY = R - radius * Math.cos((deg * Math.PI) / 180);
  const marks = stage === "hour"
    ? Array.from({ length: 12 }, (_, i) => [
        { text: String(i === 0 ? 12 : i), r: OUTER, a: i * 30, on: hour === (i === 0 ? 12 : i) },
        { text: pad(i === 0 ? 0 : i + 12), r: INNER, a: i * 30, on: hour === (i === 0 ? 0 : i + 12) },
      ]).flat()
    : Array.from({ length: 12 }, (_, i) => ({ text: pad(i * 5), r: OUTER, a: i * 30, on: minute === i * 5 }));
  // Marca coberta pela ponta do ponteiro (por exemplo "30" quando o minuto é 32): texto escuro sobre o amarelo.
  const covered = (m: { r: number; a: number }) =>
    Math.hypot(R + m.r * Math.sin((m.a * Math.PI) / 180) - tipX, R - m.r * Math.cos((m.a * Math.PI) / 180) - tipY) < 22;
  const free = stage === "minute" && minute % 5 !== 0; // minuto fora das marcas: a ponta fica sozinha

  const box = (what: "hour" | "minute", text: string) => (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={what === "hour" ? `Horas: ${text}` : `Minutos: ${text}`}
      accessibilityState={{ selected: stage === what }}
      accessibilityActions={[{ name: "increment", label: "Aumentar" }, { name: "decrement", label: "Diminuir" }]}
      onAccessibilityAction={(e) => step(what, e.nativeEvent.actionName === "increment" ? 1 : -1)}
      onPress={() => setStage(what)}
      style={[s.timeBox, { backgroundColor: stage === what ? c.primary : c.soft }]}
    >
      <T maxFontSizeMultiplier={1.2} style={{ fontFamily: "SoraBold", fontSize: 44, lineHeight: 54, color: stage === what ? c.onPrimary : c.text }}>{text}</T>
    </Pressable>
  );
  return (
    <SheetModal
      title={title}
      onClose={onClose}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title="Confirmar" icon="check" onPress={() => onPick(`${pad(hour)}:${pad(minute)}`)} />
          {optional && !!value && <Button title="Limpar a hora" secondary onPress={() => onPick("")} />}
        </View>
      }
    >
      <View style={{ alignItems: "center", gap: space.lg, paddingBottom: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          {box("hour", pad(hour))}
          <T style={{ fontFamily: "SoraBold", fontSize: 40 }} importantForAccessibility="no">:</T>
          {box("minute", pad(minute))}
        </View>
        <Animated.View
          key={stage}
          entering={reduce ? undefined : FadeIn.duration(150)}
          style={[s.dial, { backgroundColor: c.soft }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => touch(e.nativeEvent.locationX, e.nativeEvent.locationY, false)}
          onResponderMove={(e) => touch(e.nativeEvent.locationX, e.nativeEvent.locationY, false)}
          onResponderRelease={(e) => touch(e.nativeEvent.locationX, e.nativeEvent.locationY, true)}
        >
          <Svg width={DIAL} height={DIAL} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Line x1={R} y1={R} x2={tipX} y2={tipY} stroke={c.primary} strokeWidth={2} />
            <Circle cx={R} cy={R} r={4} fill={c.primary} />
            <Circle cx={tipX} cy={tipY} r={radius === INNER ? 17 : 20} fill={c.primary} />
            {free && <Circle cx={tipX} cy={tipY} r={3} fill={c.onPrimary} />}
          </Svg>
          {marks.map((m) => (
            <View key={`${m.r}-${m.text}`} pointerEvents="none" style={[s.mark, {
              left: R + m.r * Math.sin((m.a * Math.PI) / 180) - 20,
              top: R - m.r * Math.cos((m.a * Math.PI) / 180) - 20,
            }]}>
              <T style={{ fontFamily: m.on ? "SoraBold" : "Sora", fontSize: m.r === INNER ? 14 : 16, color: m.on || covered(m) ? c.onPrimary : c.text }}>{m.text}</T>
            </View>
          ))}
        </Animated.View>
        <Muted>{stage === "hour" ? "Toque na hora. Depois escolha os minutos." : "Toque ou arraste para ajustar os minutos."}</Muted>
      </View>
    </SheetModal>
  );
}

const s = StyleSheet.create({
  shell: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 26, minHeight: 52, paddingLeft: 12, paddingRight: 2 },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52 },
  typed: { flex: 1, minHeight: 52, fontFamily: "Sora", fontSize: 15, paddingLeft: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, paddingHorizontal: 8 },
  week: { flexDirection: "row", justifyContent: "space-between" },
  cell: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center" },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { minHeight: 7 * 46 + 6 * 4 },
  years: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  year: { width: "23%", minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  timeBox: { width: 96, minHeight: 72, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dial: { width: DIAL, height: DIAL, borderRadius: R },
  mark: { position: "absolute", width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
