// servidor/ambiente.js
// Variáveis de ambiente (segredos e configurações) cadastradas no painel da Cloudflare.
// A Cloudflare entrega essas variáveis a cada chamada; o worker.js as copia para cá
// e os demais arquivos leem de ENV, nunca do código.

export const ENV = {};

export function definirAmbiente(env = {}) {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string") ENV[k] = v;
  }
}

// Respostas em JSON, usadas por todas as rotas
export function json(dados, status = 200, cabecalhos = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabecalhos },
  });
}

// Lê o corpo JSON sem quebrar se vier vazio ou malformado
export async function lerCorpo(request) {
  try { return await request.json(); } catch { return {}; }
}

// Endereço do site: variável URL_SITE ou, na falta dela, o endereço que recebeu a chamada
export function enderecoSite(request) {
  if (ENV.URL_SITE) return ENV.URL_SITE.replace(/\/$/, "");
  return new URL(request.url).origin;
}
