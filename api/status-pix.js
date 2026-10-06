// api/status-pix.js
// A página consulta esta função a cada 5 segundos. Quando o Pix é aprovado,
// devolve o link temporário do PDF (manual/combo) e a chave de licença (simulador/combo).

import { consultarPagamento, processarPagamento } from "./_pedidos.js";

export default async function handler(req, res) {
  const id = String(req.query.id || "").replace(/\D/g, "");
  if (!id) return res.status(400).json({ erro: "Pagamento não informado." });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ erro: "MP_ACCESS_TOKEN não configurado." });

  try {
    const p = await consultarPagamento(id);
    if (!p) return res.status(404).json({ erro: "Pagamento não encontrado." });
    const resposta = await processarPagamento(p);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(resposta);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao consultar o pagamento." });
  }
}
