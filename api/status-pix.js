// api/status-pix.js
// A página consulta esta função a cada 5 segundos. Quando o Pix é aprovado,
// devolve o link do PDF (manual/combo) e a chave de licença (simulador/combo).

import { gerarLicenca } from "./_licenca.js";

export default async function handler(req, res) {
  const id = String(req.query.id || "").replace(/\D/g, "");
  if (!id) return res.status(400).json({ erro: "Pagamento não informado." });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ erro: "MP_ACCESS_TOKEN não configurado." });

  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return res.status(404).json({ erro: "Pagamento não encontrado." });
    const p = await r.json();

    // Só responde por pagamentos feitos neste site
    if (!String(p.external_reference || "").startsWith("manual-empregador:")) {
      return res.status(404).json({ erro: "Pagamento não encontrado." });
    }
    const plano = String(p.external_reference).split(":")[1];
    const resposta = { status: p.status, plano };

    if (p.status === "approved") {
      if (plano === "ebook" || plano === "kit") resposta.link_pdf = process.env.LINK_PDF || null;
      if (plano === "simulador" || plano === "kit") {
        try {
          resposta.licenca = await gerarLicenca({
            nome: p.metadata?.nome || [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" "),
            idPagamento: p.id,
            dataAprovacao: p.date_approved,
          });
          resposta.link_simulador = (process.env.URL_SITE || "").replace(/\/$/, "") + "/simulador/";
          console.log(`[LICENÇA] ${resposta.licenca.numero} | ${resposta.licenca.titular} | ${p.payer?.email} | pagamento ${p.id} | vence ${resposta.licenca.vencimento}`);
        } catch (e) {
          console.error("Falha ao gerar licença:", e);
          resposta.licenca_erro = true;
        }
      }
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(resposta);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Falha ao consultar o pagamento." });
  }
}
