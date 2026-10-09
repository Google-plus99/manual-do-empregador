// api/_pedidos.js
// Regras comuns à tela de status e ao webhook:
// consulta o pagamento no Mercado Pago, atualiza o pedido no Supabase,
// emite a licença uma única vez e monta os links temporários dos PDFs.

import { gerarLicenca } from "./_licenca.js";
import { supabaseAtivo, buscarUm, atualizar, inserir, linkAssinado } from "./_supabase.js";
import { OFERTAS, PRODUTOS } from "../assets/catalogo.js";

const PREFIXO = "ifl:";
const BUCKET = process.env.PDF_BUCKET || "produtos";
const PDF_VALIDADE_SEG = 60 * 60 * 24; // links dos PDFs valem 24 horas

export async function consultarPagamento(id) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) return null;
  const p = await r.json();
  // Só trata pagamentos feitos por este site e de ofertas que existem no catálogo
  const ref = String(p.external_reference || "");
  if (!ref.startsWith(PREFIXO) || !Object.hasOwn(OFERTAS, ref.slice(PREFIXO.length))) return null;
  return p;
}

const ofertaDe = p => String(p.external_reference).slice(PREFIXO.length);
const nomeDe = p => p.metadata?.nome || [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ") || "Cliente";
const CAMPOS_LIC = "select=licenca_numero,licenca_chave,licenca_vencimento,nome";
const daLinha = l => ({ numero: l.licenca_numero, chave: l.licenca_chave, vencimento: l.licenca_vencimento, titular: l.nome });

// Licença: se já foi emitida para este pagamento, reaproveita; senão emite e grava.
async function obterLicenca(p) {
  const pid = String(p.id);
  if (supabaseAtivo()) {
    const existente = await buscarUm("pedidos", `pagamento_id=eq.${pid}&licenca_chave=not.is.null&${CAMPOS_LIC}`);
    if (existente) return daLinha(existente);
  }
  const lic = await gerarLicenca({ nome: nomeDe(p), idPagamento: p.id, dataAprovacao: p.date_approved });
  if (supabaseAtivo()) {
    // Grava só se ainda estiver vazio; se o webhook e a tela chegarem juntos, vale a primeira
    const gravadas = await atualizar("pedidos", `pagamento_id=eq.${pid}&licenca_chave=is.null`, {
      licenca_numero: lic.numero, licenca_chave: lic.chave, licenca_vencimento: lic.vencimento,
    });
    if (!gravadas?.length) {
      const ja = await buscarUm("pedidos", `pagamento_id=eq.${pid}&${CAMPOS_LIC}`);
      if (ja?.licenca_chave) return daLinha(ja);
    }
  }
  console.log(`[LICENÇA] ${lic.numero} | ${lic.titular} | pagamento ${pid} | vence ${lic.vencimento}`);
  return lic;
}

// Atualiza o pedido e devolve o que a tela de confirmação precisa mostrar
export async function processarPagamento(p) {
  const oferta = ofertaDe(p);
  const itens = OFERTAS[oferta].itens;
  const resposta = { status: p.status, oferta };

  if (supabaseAtivo()) {
    try {
      // Garante que o pedido existe (caso tenha sido criado antes do Supabase estar ativo)
      await inserir("pedidos", {
        pagamento_id: String(p.id), plano: oferta, valor: p.transaction_amount, status: p.status,
        nome: nomeDe(p), email: p.payer?.email || "", aprovado_em: p.date_approved || null,
      }, { upsertEm: "pagamento_id" });
    } catch (e) { console.error("Falha ao gravar pedido:", e.message); }
  }

  if (p.status !== "approved") return resposta;

  // Um link de download para cada PDF do pedido
  const pdfs = itens.filter(i => PRODUTOS[i].tipo === "pdf");
  if (pdfs.length) {
    resposta.downloads = [];
    for (const id of pdfs) {
      let url = null;
      try { url = await linkAssinado(BUCKET, PRODUTOS[id].arquivo, PDF_VALIDADE_SEG); }
      catch (e) { console.error(`Falha no link do PDF ${id}:`, e.message); }
      resposta.downloads.push({ produto: id, titulo: PRODUTOS[id].nome, url });
    }
  }

  if (itens.includes("simulador")) {
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
