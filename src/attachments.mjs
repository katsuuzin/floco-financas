// Registro de anexo (print ou documento) de uma dívida. O arquivo fica no aparelho e não entra no backup.
export const ATTACHMENT_LISTS = ["receivables", "payables"];
const ATTACH_FILE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/u;
export const MAX_ATTACHMENTS = 10;
export function isAttachment(a) {
  return (
    !!a &&
    typeof a.id === "string" && a.id.length > 0 && a.id.length <= 60 &&
    typeof a.name === "string" && a.name.trim().length > 0 && a.name.length <= 120 &&
    typeof a.file === "string" && ATTACH_FILE.test(a.file) && !a.file.includes("..") &&
    typeof a.mime === "string" && a.mime.length <= 80 &&
    Number.isSafeInteger(a.size) && a.size >= 0
  );
}
