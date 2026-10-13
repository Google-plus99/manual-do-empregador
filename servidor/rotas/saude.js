// servidor/rotas/saude.js  (GET /api/saude)
// Diagnóstico da configuração: diz SE cada variável existe e SE cada serviço responde.
// Nunca devolve o valor de nenhuma chave, token ou dado de cliente.

import { ENV, json } from "../ambiente.js";
import { PRODUTOS } from "../../assets/catalogo.js";

const NOMES = ["MP_ACCESS_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "URL_SITE",
  "LIC_CHAVE_PRIVADA", "LIC_DOMINIO", "RESEND_API_KEY", "EMAIL_REMETENTE"];

const tem = n => Boolean((ENV[n] || "").trim());

async function tentar(fn) {
  try { return await fn(); } catch (e) { return { ok: false, erro: String(e.message || e).slice(0, 160) }; }
}

// resume a resposta de um serviço sem repassar dados
async function status(r) {
  let detalhe = "";
  if (!r.ok) { try { detalhe = (await r.text()).slice(0, 160); } catch (_) {} }
  return { ok: r.ok, http: r.status, ...(detalhe ? { detalhe } : {}) };
}

export default async function saude() {
  const variaveis = Object.fromEntries(NOMES.map(n => [n, tem(n)]));
  const res = { variaveis };

  // ---------- Supabase ----------
  const url = (ENV.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const chave = (ENV.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (url && chave) {
    const h = chave.startsWith("sb_") ? { apikey: chave } : { apikey: chave, Authorization: `Bearer ${chave}` };
    res.supabase = {
      endereco_formato_ok: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url),
      tipo_chave: chave.startsWith("eyJ") ? "service_role (legacy, correta)" : chave.startsWith("sb_secret_") ? "secret (nova)" : chave.startsWith("sb_publishable_") ? "publishable (ERRADA: use a service_role)" : "desconhecido",
      espacos_na_chave: chave !== ENV.SUPABASE_SERVICE_ROLE_KEY,
      tabela_contatos: await tentar(async () => status(await fetch(`${url}/rest/v1/contatos?select=id&limit=1`, { headers: h }))),
      tabela_pedidos: await tentar(async () => status(await fetch(`${url}/rest/v1/pedidos?select=id&limit=1`, { headers: h }))),
      pdfs_no_bucket: await tentar(async () => {
        const r = await fetch(`${url}/storage/v1/object/list/${ENV.PDF_BUCKET || "produtos"}`, {
          method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 100 }),
        });
        if (!r.ok) return status(r);
        const nomes = (await r.json()).map(o => o.name);
        return Object.fromEntries(Object.values(PRODUTOS).filter(p => p.arquivo).map(p => [p.arquivo, nomes.includes(p.arquivo)]));
      }),
    };
  }

  // ---------- Chave de licença ----------
  if (tem("LIC_CHAVE_PRIVADA")) {
    res.licenca = await tentar(async () => {
      await crypto.subtle.importKey("jwk", JSON.parse(ENV.LIC_CHAVE_PRIVADA.trim()), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
      return { ok: true, dominio: (ENV.LIC_DOMINIO || "").trim() || null };
    });
  }

  // ---------- Mercado Pago ----------
  if (tem("MP_ACCESS_TOKEN")) {
    const t = ENV.MP_ACCESS_TOKEN.trim();
    res.mercado_pago = {
      producao: t.startsWith("APP_USR-"),
      espacos_no_token: t !== ENV.MP_ACCESS_TOKEN,
      conexao: await tentar(async () => status(await fetch("https://api.mercadopago.com/v1/payment_methods", { headers: { Authorization: `Bearer ${t}` } }))),
    };
  }

  // ---------- Resend ----------
  if (tem("RESEND_API_KEY")) {
    const rem = (ENV.EMAIL_REMETENTE || "").trim();
    const dominio = (rem.match(/@([^>\s]+)/) || [])[1] || null;
    res.resend = {
      dominio_do_remetente: dominio,
      dominio: await tentar(async () => {
        const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY.trim()}` } });
        if (r.status === 401 || r.status === 403) return { ok: null, aviso: "chave só de envio (normal); confira o domínio no painel do Resend" };
        if (!r.ok) return status(r);
        const d = ((await r.json()).data || []).find(x => x.name === dominio);
        return d ? { ok: d.status === "verified", status: d.status } : { ok: false, aviso: "domínio do remetente não cadastrado no Resend" };
      }),
    };
  }

  return json(res);
}
