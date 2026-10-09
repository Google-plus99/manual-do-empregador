// api/_supabase.js
// Acesso ao Supabase pelo servidor, via API REST (sem dependências).
// Usa a chave service_role, que NUNCA pode ir para o navegador.
// Se as variáveis não estiverem configuradas, as funções simplesmente não gravam nada,
// e o site continua vendendo normalmente.

const URL_SB = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAtivo = () => Boolean(URL_SB && CHAVE);

function cabecalhos(extra = {}) {
  return { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, "Content-Type": "application/json", ...extra };
}

async function chamar(caminho, opcoes = {}) {
  const r = await fetch(`${URL_SB}${caminho}`, opcoes);
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${texto.slice(0, 300)}`);
  return dados;
}

// ---------- Tabelas (PostgREST) ----------
export async function inserir(tabela, linha, { upsertEm } = {}) {
  if (!supabaseAtivo()) return null;
  const q = upsertEm ? `?on_conflict=${upsertEm}` : "";
  const prefer = upsertEm ? "resolution=merge-duplicates,return=representation" : "return=representation";
  const r = await chamar(`/rest/v1/${tabela}${q}`, { method: "POST", headers: cabecalhos({ Prefer: prefer }), body: JSON.stringify(linha) });
  return r?.[0] || null;
}

export async function buscarUm(tabela, filtro) {
  if (!supabaseAtivo()) return null;
  const r = await chamar(`/rest/v1/${tabela}?${filtro}&limit=1`, { headers: cabecalhos() });
  return r?.[0] || null;
}

// Atualiza só as linhas que casam com o filtro; devolve as linhas alteradas
export async function atualizar(tabela, filtro, campos) {
  if (!supabaseAtivo()) return [];
  return chamar(`/rest/v1/${tabela}?${filtro}`, { method: "PATCH", headers: cabecalhos({ Prefer: "return=representation" }), body: JSON.stringify(campos) });
}

// ---------- Armazenamento: link temporário para o PDF privado ----------
export async function linkAssinado(bucket, caminho, segundos) {
  if (!supabaseAtivo()) return null;
  const r = await chamar(`/storage/v1/object/sign/${bucket}/${encodeURI(caminho)}`, {
    method: "POST", headers: cabecalhos(), body: JSON.stringify({ expiresIn: segundos }),
  });
  const rel = r?.signedURL || r?.signedUrl;
  if (!rel) return null;
  // Força o download com o próprio nome do arquivo
  return `${URL_SB}/storage/v1${rel}&download=${encodeURIComponent(caminho)}`;
}
