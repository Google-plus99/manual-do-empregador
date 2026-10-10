// servidor/rotas/criar-pix.js  (POST /api/criar-pix)
// Modo "pix-no-site" (desligado por enquanto, ver CONFIG.pagamento em assets/app.js):
// cria a cobrança Pix no Mercado Pago e devolve o QR Code para a própria página.
// O Access Token fica SOMENTE no servidor (variável no painel da Cloudflare).

import { inserir } from "../supabase.js";
import { ENV, json, lerCorpo } from "../ambiente.js";

// ---- O valor cobrado vem do catálogo único (assets/catalogo.js), nunca da página ----
import { OFERTAS } from "../../assets/catalogo.js";
export const PREFIXO_REF = "ifl:";
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

export default async function criarPix(request) {
  const token = ENV.MP_ACCESS_TOKEN;
  if (!token) return json({ erro: "Pagamento indisponível no momento." }, 500);

  const { nome, email, cpf, oferta } = await lerCorpo(request);
  if (!Object.hasOwn(OFERTAS, oferta)) return json({ erro: "Produto inválido." }, 400);
  const p = oferta, o = OFERTAS[p];
  const nomeLimpo = String(nome || "").trim().replace(/\s+/g, " ");

  if (nomeLimpo.split(" ").length < 2) return json({ erro: "Informe nome e sobrenome." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) return json({ erro: "Informe um e-mail válido." }, 400);
  if (!cpfValido(cpf)) return json({ erro: "CPF inválido. Confira os números digitados." }, 400);

  const [primeiro, ...resto] = nomeLimpo.split(" ");
  const corpo = {
    transaction_amount: o.preco,
    description: `Instituto Felipe Lopes: ${o.descricao}`,
    payment_method_id: "pix",
    date_of_expiration: expiracao(VALIDADE_MINUTOS),
    external_reference: `${PREFIXO_REF}${p}`,
    metadata: { oferta: p, nome: nomeLimpo, email: String(email).trim() },
    payer: {
      email: String(email).trim(),
      first_name: primeiro,
      last_name: resto.join(" "),
      identification: { type: "CPF", number: soNumeros(cpf) },
    },
  };
  corpo.notification_url = `${(ENV.URL_SITE || new URL(request.url).origin).replace(/\/$/, "")}/api/webhook`;

  try {
    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(corpo),
    });
    const d = await r.json();
    if (!r.ok) {
      console.error("Erro Mercado Pago:", JSON.stringify(d));
      return json({ erro: "Não foi possível gerar o Pix agora. Tente novamente em instantes." }, 502);
    }
    // Registra o pedido no Supabase (se configurado). Falha aqui não impede a venda.
    try {
      await inserir("pedidos", {
        pagamento_id: String(d.id), plano: p, valor: o.preco, status: d.status,
        nome: nomeLimpo, email: String(email).trim(),
      }, { upsertEm: "pagamento_id" });
    } catch (e) { console.error("Falha ao gravar pedido:", e.message); }

    const pix = d.point_of_interaction?.transaction_data || {};
    return json({
      id: d.id, status: d.status, oferta: p, valor: o.preco,
      qr_code: pix.qr_code, qr_code_base64: pix.qr_code_base64, ticket_url: pix.ticket_url,
      expira_em: d.date_of_expiration,
    });
  } catch (e) {
    console.error(e);
    return json({ erro: "Falha de comunicação com o Mercado Pago." }, 500);
  }
}
