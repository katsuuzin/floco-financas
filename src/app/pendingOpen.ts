// Pedido para abrir a folha "Revisar pendência" de uma notificação do banco.
// Vem do aviso do Floco (link floco://pendencia/<id>). Guarda o pedido até a Início existir
// (app fechado ou travado por biometria) e avisa quem estiver ouvindo (app aberto).
let wanted: string | null = null;
const listeners = new Set<(id: string) => void>();

export function requestOpenPending(id: string) {
  if (!id) return;
  wanted = id;
  listeners.forEach((listener) => listener(id));
}

export function takeWantedPending(): string | null {
  const id = wanted;
  wanted = null;
  return id;
}

export function onOpenPending(listener: (id: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
