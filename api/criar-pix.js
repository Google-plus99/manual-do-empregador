// api/criar-pix.js
// Cria a cobrança Pix no Mercado Pago e devolve o QR Code para a página.
// O Access Token fica SOMENTE aqui no servidor (variável de ambiente na Vercel).

import { randomUUID } from "node:crypto";
import { inserir } from "./_supabase.js";

// ---- PLANOS: o valor cobrado de verdade é definido aqui, nunca pela página ----
export const PLANOS = {
  ebook:     { valor: 47.0,  descricao: "Manual do Empregador - E-book (PDF)" },
  simulador: { valor: 97.0,  descricao: "Simulador Tributário Regime Certo (licença 12 meses)" },
  kit:       { valor: 117.0, descricao: "Combo Manual do Empregador + Simulador Regime Certo (licença 12 meses)" },
};
const VALIDADE_MINUTOS = 30;

const soNumeros = s => String(s || "").replace(/\D/g, "");

function cpfValido(cpf) {
  cpf = soNumeros(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[t])) return false;
  }
  return true;
}

// Expiração no horário de Brasília (-03:00), formato aceito pelo Mercado Pago
function expiracao(min) {
  return new Date(Date.now() + min * 60000 - 3 * 3600000).toISOString().replace("Z", "-03:00");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: "Pagamento indisponível no momento." });

  const { nome, email, cpf, plano } = req.body || {};
  const p = PLANOS[plano] ? plano : "ebook";
  const nomeLimpo = String(nome || "").trim().replace(/\s+/g, " ");

  if (nomeLimpo.split(" ").length < 2) return res.status(400).json({ erro: "Informe nome e sobrenome." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) return res.status(400).json({ erro: "Informe um e-mail válido." });
  if (!cpfValido(cpf)) return res.status(400).json({ erro: "CPF inválido. Confira os números digitados." });

  const [primeiro, ...resto] = nomeLimpo.split(" ");
  const corpo = {
    transaction_amount: PLANOS[p].valor,
    description: PLANOS[p].descricao,
    payment_method_id: "pix",
    date_of_expiration: expiracao(VALIDADE_MINUTOS),
    external_reference: `manual-empregador:${p}`,
    metadata: { plano: p, nome: nomeLimpo },
    payer: {
      email: String(email).trim(),
      first_name: primeiro,
      last_name: resto.join(" "),
      identification: { type: "CPF", number: soNumeros(cpf) },
    },
  };
  if (process.env.URL_SITE) corpo.notification_url = `${process.env.URL_SITE.replace(/\/$/, "")}/api/webhook`;

  try {
    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": randomUUID() },
      body: JSON.stringify(corpo),
    });
    const d = await r.json();
    if (!r.ok) {
      console.error("Erro Mercado Pago:", JSON.stringify(d));
      return res.status(502).json({ erro: "Não foi possível gerar o Pix agora. Tente novamente em instantes." });
    }
    // Registra o pedido no Supabase (se configurado). Falha aqui não impede a venda.
    try {
      await inserir("pedidos", {
        pagamento_id: String(d.id), plano: p, valor: PLANOS[p].valor, status: d.status,
        nome: nomeLimpo, email: String(email).trim(),
      }, { upsertEm: "pagamento_id" });
    } catch (e) { console.error("Falha ao gravar pedido:", e.message); }

    const pix = d.point_of_interaction?.transaction_data || {};
    return res.status(200).json({
      id: d.id, status: d.status, plano: p, valor: PLANOS[p].valor,
      qr_code: pix.qr_code, qr_code_base64: pix.qr_code_base64, ticket_url: pix.ticket_url,
      expira_em: d.date_of_expiration,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha de comunicação com o Mercado Pago." });
  }
}
