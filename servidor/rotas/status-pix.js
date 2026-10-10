// servidor/rotas/status-pix.js  (GET /api/status-pix?id=...&email=...)
// A página (janela do Pix ou /obrigado) consulta esta rota a cada 5 segundos.
// Quando o pagamento é aprovado e o e-mail confere,
// devolve o link temporário de cada PDF e a chave de licença do simulador.

import { consultarPagamento, processarPagamento } from "../pedidos.js";
import { ENV, json, enderecoSite } from "../ambiente.js";

export default async function statusPix(request) {
  const q = new URL(request.url).searchParams;
  const id = String(q.get("id") || "").replace(/\D/g, "");
  if (!id) return json({ erro: "Pagamento não informado." }, 400);
  if (!ENV.MP_ACCESS_TOKEN) return json({ erro: "MP_ACCESS_TOKEN não configurado." }, 500);

  try {
    const p = await consultarPagamento(id);
    if (!p) return json({ erro: "Pagamento não encontrado." }, 404);
    const resposta = await processarPagamento(p, enderecoSite(request));

    // Os arquivos e a chave só aparecem para quem informa o e-mail usado na compra.
    // Assim, quem descobrir o número de um pagamento não consegue baixar nada.
    const norm = v => String(v || "").trim().toLowerCase();
    const emailCompra = norm(p.metadata?.email || p.payer?.email);
    if (resposta.status === "approved" && (!emailCompra || norm(q.get("email")) !== emailCompra)) {
      delete resposta.downloads; delete resposta.licenca; delete resposta.link_simulador;
      resposta.confirme_email = true;
    }
    return json(resposta);
  } catch (e) {
    console.error(e);
    return json({ erro: "Falha ao consultar o pagamento." }, 500);
  }
}
