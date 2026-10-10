// api/criar-pagamento.js
// Checkout Pro do Mercado Pago: cria a "preferência" de pagamento e devolve o link
// da página do Mercado Pago para onde o cliente é levado.
// Depois do pagamento, o Mercado Pago devolve o cliente para /obrigado e avisa o
// servidor em /api/webhook, que registra o pedido, emite a licença e manda o e-mail.

import { OFERTAS } from "../assets/catalogo.js";
import { randomUUID } from "node:crypto";

// "pix"   = só Pix na página do Mercado Pago
// "todas" = Pix, cartão (com parcelamento) e boleto
const FORMAS = "pix";
const PARCELAS_MAX = 12; // usado só quando FORMAS = "todas"

const limpar = (s, max) => String(s || "").trim().replace(/\s+/g, " ").slice(0, max);

// Endereço do site: variável URL_SITE ou, na falta dela, o endereço que recebeu a chamada
function enderecoSite(req) {
  if (process.env.URL_SITE) return process.env.URL_SITE.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: "Pagamento indisponível no momento." });

  const { oferta } = req.body || {};
  const nome = limpar(req.body?.nome, 120);
  const email = limpar(req.body?.email, 160).toLowerCase();
  if (!Object.hasOwn(OFERTAS, oferta)) return res.status(400).json({ erro: "Produto inválido." });
  if (nome.split(" ").length < 2) return res.status(400).json({ erro: "Informe nome e sobrenome." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: "Informe um e-mail válido." });

  const o = OFERTAS[oferta];
  const site = enderecoSite(req);
  const [primeiro, ...resto] = nome.split(" ");

  const preferencia = {
    items: [{
      id: oferta,
      title: `Instituto Felipe Lopes: ${o.nome}`,
      description: o.descricao,
      quantity: 1,
      currency_id: "BRL",
      unit_price: o.preco,
    }],
    payer: { name: primeiro, surname: resto.join(" "), email },
    external_reference: `ifl:${oferta}`,
    metadata: { oferta, nome, email },
    back_urls: {
      success: `${site}/obrigado`,
      pending: `${site}/obrigado`,
      failure: `${site}/obrigado`,
    },
    auto_return: "approved",
    notification_url: `${site}/api/webhook`,
    statement_descriptor: "INST FELIPE LOPES",
    payment_methods: FORMAS === "pix"
      ? { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }, { id: "prepaid_card" }] }
      : { installments: PARCELAS_MAX },
  };

  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": randomUUID() },
      body: JSON.stringify(preferencia),
    });
    const d = await r.json();
    if (!r.ok || !d.init_point) {
      console.error("Erro Mercado Pago (preferência):", JSON.stringify(d));
      return res.status(502).json({ erro: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." });
    }
    return res.status(200).json({ url: d.init_point, preferencia: d.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha de comunicação com o Mercado Pago." });
  }
}
