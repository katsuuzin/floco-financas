// Gráficos da aba Análise (react-native-svg): ritmo de gasto, barras de 12 meses e curva da
// fatura. Cores do tema do Calen; o amarelo Solar faz o papel do roxo.
import React from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Path, Line, Circle, Rect, Text as SvgText } from "react-native-svg";
import { useCalen, CText } from "../../ui/calen";
import { compactCents } from "../../spending.mjs";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const monthShort = (m: string) => MONTHS[Number(m.slice(5)) - 1];

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10) * p;
}

// Ritmo do mês: linha cheia (este mês), pontilhada cinza (mês passado) e tracejada (previsão).
export function PaceChart({ pace, height = 190, hidden, tk }: { pace: any; height?: number; hidden?: boolean; tk?: any }) {
  const cal = useCalen();
  const k = tk || cal.k;
  const { width } = useWindowDimensions();
  const w = Math.min(width - 64, 560);
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 24;
  const n = pace.days;
  const max = niceMax(Math.max(pace.projectedEnd, pace.lastTotal, ...(pace.current.length ? [pace.current[pace.current.length - 1]] : [0])));
  const x = (day: number) => padL + ((day - 1) / Math.max(1, n - 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (height - padT - padB);
  const line = (arr: number[], offset = 1) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const curPath = pace.current.length ? line(pace.current) : "";
  const lastDay = pace.current.length;
  const area = pace.current.length > 1 ? `${curPath} L ${x(lastDay).toFixed(1)} ${y(0)} L ${x(1).toFixed(1)} ${y(0)} Z` : "";
  const projectedPath = pace.isCurrent && lastDay && lastDay < n ? `M ${x(lastDay).toFixed(1)} ${y(pace.current[lastDay - 1]).toFixed(1)} L ${x(n).toFixed(1)} ${y(pace.projectedEnd).toFixed(1)}` : "";
  return (
    <View accessible accessibilityLabel={hidden ? "Gráfico do ritmo de gasto do mês" : `Gasto acumulado do mês: ${compactCents(pace.total)} até agora. Mês passado: ${compactCents(pace.lastToDate)} no mesmo dia. Previsão para o fim do mês: ${compactCents(pace.projectedEnd)}.`}>
      <Svg width={w} height={height}>
        {[0, 0.5, 1].map((f) => (
          <Line key={f} x1={padL} x2={w - padR} y1={y(max * f)} y2={y(max * f)} stroke={k.line} strokeWidth={1} strokeDasharray={f === 0 ? undefined : "3 4"} />
        ))}
        {pace.last.length > 1 && <Path d={line(pace.last)} stroke={k.subtle} strokeWidth={1.6} strokeDasharray="2 4" strokeLinecap="round" fill="none" />}
        {area ? <Path d={area} fill={k.primary} opacity={0.14} /> : null}
        {projectedPath ? <Path d={projectedPath} stroke={k.primary} strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" fill="none" /> : null}
        {curPath ? <Path d={curPath} stroke={k.primary} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
        {lastDay > 0 && <Circle cx={x(lastDay)} cy={y(pace.current[lastDay - 1])} r={4.5} fill={k.primary} stroke={k.card} strokeWidth={2} />}
        {[1, Math.ceil(n / 2), n].map((d) => (
          <SvgText key={d} x={x(d)} y={height - 6} fontSize={10} fill={k.subtle} textAnchor={d === 1 ? "start" : d === n ? "end" : "middle"}>
            {d}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// Doze meses de barras: valor realizado cheio e previsto mais claro, o mês escolhido em destaque.
export function YearBars({ bars, month, kind, onPick }: { bars: any[]; month: string; kind: "expense" | "income"; onPick?: (m: string) => void }) {
  const { k, alpha } = useCalen();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 64, 560);
  const h = 170;
  const padL = 30;
  const padB = 28;
  const padT = 8;
  const real = (b: any) => (kind === "income" ? b.income : b.spent);
  const plan = (b: any) => (kind === "income" ? b.plannedIn : b.plannedOut);
  const max = niceMax(Math.max(...bars.map((b) => real(b) + plan(b)), 1));
  const slot = (w - padL) / bars.length;
  const bw = Math.min(18, slot * 0.62);
  const color = kind === "income" ? k.success : k.danger;
  const y = (v: number) => padT + (1 - v / max) * (h - padT - padB);
  return (
    <View accessible accessibilityLabel={`Barras dos 12 meses. ${bars.map((b) => `${monthShort(b.month)}: ${compactCents(real(b))}${plan(b) ? ", previsto " + compactCents(plan(b)) : ""}`).join("; ")}`}>
      <Svg width={w} height={h}>
        {[0, 0.5, 1].map((f) => (
          <React.Fragment key={f}>
            <Line x1={padL} x2={w} y1={y(max * f)} y2={y(max * f)} stroke={k.line} strokeWidth={1} strokeDasharray={f === 0 ? undefined : "3 4"} />
            <SvgText x={0} y={y(max * f) + 3} fontSize={10} fill={k.subtle}>
              {compactCents(max * f)}
            </SvgText>
          </React.Fragment>
        ))}
        {bars.map((b, i) => {
          const cx = padL + slot * i + slot / 2;
          const on = b.month === month;
          const rv = real(b);
          const pv = plan(b);
          return (
            <React.Fragment key={b.month}>
              {on && <Rect x={cx - slot / 2 + 1} y={padT} width={slot - 2} height={h - padT - padB + 6} rx={8} fill={alpha(k.primary, 0.12)} />}
              {pv > 0 && <Rect x={cx - bw / 2} y={y(rv + pv)} width={bw} height={Math.max(0, y(rv) - y(rv + pv))} rx={4} fill={alpha(color, 0.3)} />}
              {rv > 0 ? <Rect x={cx - bw / 2} y={y(rv)} width={bw} height={Math.max(2, y(0) - y(rv))} rx={4} fill={color} opacity={on ? 1 : 0.85} /> : <Rect x={cx - bw / 2} y={y(0) - 2} width={bw} height={2} rx={1} fill={k.line} />}
              {on && rv + pv > 0 && (
                <SvgText x={Math.min(w - 44, Math.max(padL + 44, cx))} y={Math.max(9, y(rv + pv) - 5)} fontSize={10} fontWeight="700" fill={k.text} textAnchor="middle">
                  {pv > 0 ? `${compactCents(rv)} de ${compactCents(rv + pv)}` : compactCents(rv)}
                </SvgText>
              )}
              <SvgText x={cx} y={h - 10} fontSize={10} fontWeight={on ? "700" : "400"} fill={on ? k.text : k.subtle} textAnchor="middle" onPress={onPick ? () => onPick(b.month) : undefined}>
                {monthShort(b.month)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// Curva suave por três pontos (mês anterior, mês, mês seguinte) com o mês escolhido destacado.
export function TrendCurve({ values, height = 96 }: { values: number[]; height?: number }) {
  const { k } = useCalen();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 64, 560);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => ({ x: (w / values.length) * (i + 0.5), y: 14 + (1 - (v - min) / span) * (height - 28) }));
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  return (
    <Svg width={w} height={height}>
      <Path d={d} stroke={k.primary} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={i === 1 ? 5 : 3.5} fill={i === 1 ? k.primary : k.card} stroke={k.primary} strokeWidth={2} />
      ))}
    </Svg>
  );
}

// Gráfico de linha simples de saldo por dia (aba Projeção do Fluxo).
export function BalanceLine({ values, height = 150 }: { values: (number | null)[]; height?: number }) {
  const { k } = useCalen();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 64, 560);
  const nums = values.filter((v): v is number => v !== null);
  if (!nums.length) return <View style={{ height }} />;
  const max = Math.max(...nums, 0);
  const min = Math.min(...nums, 0);
  const span = Math.max(1, max - min);
  const x = (i: number) => 6 + (i / Math.max(1, values.length - 1)) * (w - 12);
  const y = (v: number) => 10 + (1 - (v - min) / span) * (height - 24);
  let d = "";
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${d ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
  });
  return (
    <Svg width={w} height={height}>
      <Line x1={6} x2={w - 6} y1={y(0)} y2={y(0)} stroke={k.line} strokeWidth={1} strokeDasharray="3 4" />
      <Path d={d} stroke={k.primary} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
