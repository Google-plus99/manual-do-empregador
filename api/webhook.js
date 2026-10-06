// api/webhook.js
// O Mercado Pago chama esta URL quando o status de um pagamento muda.
// Hoje ela confirma o pagamento e registra nos logs da Vercel (aba "Logs").
// Futuramente, é aqui que se pode enviar o PDF por e-mail ao comprador.

export default async function handler(req, res) {
  try {
    const tipo = req.body?.type || req.query?.type || req.query?.topic;
    const id = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
    if (tipo !== "payment" || !id) return res.status(200).json({ ok: true });

    // Nunca confiar no conteúdo do aviso: sempre consultar o pagamento direto no Mercado Pago
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const p = await r.json();

    if (String(p.external_reference || "").startsWith("manual-empregador:")) {
      console.log(`[PIX] ${p.external_reference} | Pagamento ${p.id} | status: ${p.status} | comprador: ${p.payer?.email} | valor: R$ ${p.transaction_amount}`);
      // if (p.status === "approved") { enviar e-mail com o PDF aqui }
    }
  } catch (e) {
    console.error("Erro no webhook:", e);
  }
  // Sempre responde 200 para o Mercado Pago não ficar reenviando o aviso
  return res.status(200).json({ ok: true });
}
