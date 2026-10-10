// servidor/rotas/criar-pagamento.js  (POST /api/criar-pagamento)
// Checkout Pro do Mercado Pago: cria a "preferência" de pagamento e devolve o link
// da página do Mercado Pago para onde o cliente é levado.
// Depois do pagamento, o Mercado Pago devolve o cliente para /obrigado e avisa o
// servidor em /api/webhook, que registra o pedido, emite a licença e manda o e-mail.

import { OFERTAS } from "../../assets/catalogo.js";
import { ENV, json, lerCorpo, enderecoSite } from "../ambiente.js";

// "pix"   = só Pix na página do Mercado Pago
// "todas" = Pix, cartão (com parcelamento) e boleto
const FORMAS = "pix";
const PARCELAS_MAX = 12; // usado só quando FORMAS = "todas"

const limpar = (s, max) => String(s || "").trim().replace(/\s+/g, " ").slice(0, max);

export default async function criarPagamento(request) {
  const token = ENV.MP_ACCESS_TOKEN;
  if (!token) return json({ erro: "Pagamento indisponível no momento." }, 500);

  const b = await lerCorpo(request);
  const oferta = b.oferta;
  const nome = limpar(b.nome, 120);
  const email = limpar(b.email, 160).toLowerCase();
  if (!Object.hasOwn(OFERTAS, oferta)) return json({ erro: "Produto inválido." }, 400);
  if (nome.split(" ").length < 2) return json({ erro: "Informe nome e sobrenome." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: "Informe um e-mail válido." }, 400);

  const o = OFERTAS[oferta];
  const site = enderecoSite(request);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(preferencia),
    });
    const d = await r.json();
    if (!r.ok || !d.init_point) {
      console.error("Erro Mercado Pago (preferência):", JSON.stringify(d));
      return json({ erro: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." }, 502);
    }
    return json({ url: d.init_point, preferencia: d.id });
  } catch (e) {
    console.error(e);
    return json({ erro: "Falha de comunicação com o Mercado Pago." }, 500);
  }
}
