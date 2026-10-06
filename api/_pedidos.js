// api/_pedidos.js
// Regras comuns à tela de status e ao webhook:
// consulta o pagamento no Mercado Pago, atualiza o pedido no Supabase,
// emite a licença uma única vez e monta o link temporário do PDF.

import { gerarLicenca } from "./_licenca.js";
import { supabaseAtivo, buscarUm, atualizar, inserir, linkAssinado } from "./_supabase.js";

const PREFIXO = "manual-empregador:";
const BUCKET = process.env.PDF_BUCKET || "ebook";
const PDF_CAMINHO = process.env.PDF_CAMINHO || "manual-do-empregador.pdf";
const PDF_VALIDADE_SEG = 60 * 60 * 24; // link do PDF vale 24 horas

export const incluiEbook = plano => plano === "ebook" || plano === "kit";
export const incluiSimulador = plano => plano === "simulador" || plano === "kit";

export async function consultarPagamento(id) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return null;
  const p = await r.json();
  // Só trata pagamentos feitos por este site
  if (!String(p.external_reference || "").startsWith(PREFIXO)) return null;
  return p;
}

const planoDe = p => String(p.external_reference).slice(PREFIXO.length);
const nomeDe = p => p.metadata?.nome || [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ") || "Cliente";

// Licença: se já foi emitida para este pagamento, reaproveita; senão emite e grava.
async function obterLicenca(p) {
  const pid = String(p.id);
  if (supabaseAtivo()) {
    const existente = await buscarUm("pedidos", `pagamento_id=eq.${pid}&licenca_chave=not.is.null&select=licenca_numero,licenca_chave,licenca_vencimento,nome`);
    if (existente) return { numero: existente.licenca_numero, chave: existente.licenca_chave, vencimento: existente.licenca_vencimento, titular: existente.nome };
  }
  const lic = await gerarLicenca({ nome: nomeDe(p), idPagamento: p.id, dataAprovacao: p.date_approved });
  if (supabaseAtivo()) {
    // Grava só se ainda estiver vazio; se o webhook e a tela chegarem juntos, vale a primeira
    const gravadas = await atualizar("pedidos", `pagamento_id=eq.${pid}&licenca_chave=is.null`, {
      licenca_numero: lic.numero, licenca_chave: lic.chave, licenca_vencimento: lic.vencimento,
    });
    if (!gravadas?.length) {
      const ja = await buscarUm("pedidos", `pagamento_id=eq.${pid}&select=licenca_numero,licenca_chave,licenca_vencimento,nome`);
      if (ja?.licenca_chave) return { numero: ja.licenca_numero, chave: ja.licenca_chave, vencimento: ja.licenca_vencimento, titular: ja.nome };
    }
  }
  console.log(`[LICENÇA] ${lic.numero} | ${lic.titular} | pagamento ${pid} | vence ${lic.vencimento}`);
  return lic;
}

// Atualiza o pedido e devolve o que a tela de confirmação precisa mostrar
export async function processarPagamento(p) {
  const plano = planoDe(p);
  const resposta = { status: p.status, plano };

  if (supabaseAtivo()) {
    try {
      // Garante que o pedido existe (caso tenha sido criado antes do Supabase estar ativo)
      await inserir("pedidos", {
        pagamento_id: String(p.id), plano, valor: p.transaction_amount, status: p.status,
        nome: nomeDe(p), email: p.payer?.email || "", aprovado_em: p.date_approved || null,
      }, { upsertEm: "pagamento_id" });
    } catch (e) { console.error("Falha ao gravar pedido:", e.message); }
  }

  if (p.status !== "approved") return resposta;

  if (incluiEbook(plano)) {
    try { resposta.link_pdf = await linkAssinado(BUCKET, PDF_CAMINHO, PDF_VALIDADE_SEG); }
    catch (e) { console.error("Falha no link do PDF:", e.message); }
    if (!resposta.link_pdf) resposta.link_pdf = process.env.LINK_PDF || null; // reserva
  }
  if (incluiSimulador(plano)) {
    try {
      resposta.licenca = await obterLicenca(p);
      resposta.link_simulador = (process.env.URL_SITE || "").replace(/\/$/, "") + "/simulador/";
    } catch (e) {
      console.error("Falha ao gerar licença:", e.message);
      resposta.licenca_erro = true;
    }
  }
  return resposta;
}
