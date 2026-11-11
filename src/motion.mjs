// Movimento dos botões do Floco: valores puros, sem React, para testar sem aparelho.
// Princípios: o toque responde na hora (afunda um pouco), solta com uma mola curta e
// nada se move sozinho. Com "reduzir movimento" ligado no Android, só muda a opacidade.

export const PRESS_KINDS = Object.freeze({
  button: { scale: 0.96, opacity: 0.85 }, // botões cheios e secundários
  icon: { scale: 0.96, opacity: 0.85 }, // botões de ícone, alvo pequeno
  row: { scale: 0.985, opacity: 0.9 }, // linhas de lista e cartões tocáveis
  chip: { scale: 0.96, opacity: 0.85 }, // chips, abas e segmentos
  fab: { scale: 0.96, opacity: 0.95 }, // botão + central da barra
});

const DOWN_MS = 90;
const SPRING = Object.freeze({ speed: 40, bounciness: 7 });
const RELEASE_FALLBACK_MS = 140;

const known = (kind) => Object.hasOwn(PRESS_KINDS, kind) ? kind : "button";

// Configuração da animação para um tipo de controle.
// disabled: sem movimento e sem mudança. reduceMotion: sem escala, só opacidade, sem mola.
export function motionConfig(kind, { reduceMotion = false, disabled = false } = {}) {
  const base = PRESS_KINDS[known(kind)];
  if (disabled) return { scale: 1, opacity: 1, downMs: 0, spring: null, releaseMs: 0 };
  if (reduceMotion) {
    return { scale: 1, opacity: base.opacity, downMs: DOWN_MS, spring: null, releaseMs: RELEASE_FALLBACK_MS };
  }
  return { scale: base.scale, opacity: base.opacity, downMs: DOWN_MS, spring: { ...SPRING }, releaseMs: RELEASE_FALLBACK_MS };
}

// Pode haver um valor de "reduzir movimento" que não chegou ainda (null): trata como ligado
// por segurança até saber, para nunca animar contra a preferência da pessoa.
export function shouldReduce(value) {
  return value !== false;
}
