export function normalizeRepository(value) {
  const repo = String(value)
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(repo))
    throw Error("Informe o repositório como usuario/floco-financas.");
  return repo;
}
export function versionParts(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value));
  if (!match) throw Error("Use uma versão estável no formato v1.2.3.");
  return match.slice(1).map(Number);
}
export function newerVersion(candidate, current) {
  const a = versionParts(candidate),
    b = versionParts(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
export function selectRelease(release, currentVersion) {
  if (release.draft || release.prerelease)
    throw Error("Esta versão ainda não é estável.");
  if (!newerVersion(release.tag_name, currentVersion)) return null;
  const asset = release.assets?.find((a) => a.name === "Floco-Financas.apk");
  if (
    !asset ||
    !Number.isSafeInteger(asset.id) ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    asset.size > 250 * 1024 * 1024
  )
    throw Error("A release precisa conter Floco-Financas.apk (até 250 MB).");
  if (!/^sha256:[a-f0-9]{64}$/.test(asset.digest || ""))
    throw Error(
      "O GitHub ainda não disponibilizou o SHA-256 do APK. Tente novamente depois.",
    );
  return {
    version: release.tag_name,
    notes: String(release.body || "Melhorias e correções.").slice(0, 5000),
    assetId: asset.id,
    size: asset.size,
    sha256: asset.digest.slice(7),
  };
}
export async function checkRelease(repo, token, currentVersion) {
  const repository = normalizeRepository(repo);
  if (!token?.trim())
    throw Error("Configure seu token de leitura nas atualizações.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases/latest`,
      {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: controller.signal,
      },
    );
    if (response.status === 401)
      throw Error("Token inválido ou expirado. Atualize a credencial.");
    if (response.status === 404)
      throw Error(
        "Nenhuma release acessível. Confira o repositório, a permissão Contents: Read e se já existe uma release publicada.",
      );
    if (response.status === 403 || response.status === 429)
      throw Error(
        "O GitHub limitou a consulta ou o token não tem acesso. Tente depois e confira as permissões.",
      );
    if (!response.ok)
      throw Error(
        `Não foi possível consultar o GitHub (HTTP ${response.status}).`,
      );
    return selectRelease(await response.json(), currentVersion);
  } catch (e) {
    if (e.name === "AbortError")
      throw Error(
        "A consulta demorou demais. Confira sua conexão e tente novamente.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
