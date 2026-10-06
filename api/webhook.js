// api/webhook.js
// O Mercado Pago chama esta URL quando o status de um pagamento muda.
// Atualiza o pedido no Supabase e, se aprovado, já emite a licença,
// mesmo que o cliente tenha fechado a página antes da confirmação.

import { consultarPagamento, processarPagamento } from "./_pedidos.js";

export default async function handler(req, res) {
  try {
    const tipo = req.body?.type || req.query?.type || req.query?.topic;
    const id = String(req.body?.data?.id || req.query?.["data.id"] || req.query?.id || "").replace(/\D/g, "");
    if (tipo === "payment" && id) {
      // Nunca confiar no conteúdo do aviso: sempre consultar o pagamento direto no Mercado Pago
      const p = await consultarPagamento(id);
      if (p) {
        await processarPagamento(p);
        console.log(`[PIX] ${p.external_reference} | pagamento ${p.id} | ${p.status} | ${p.payer?.email} | R$ ${p.transaction_amount}`);
      }
    }
  } catch (e) {
    console.error("Erro no webhook:", e);
  }
  // Sempre responde 200 para o Mercado Pago não ficar reenviando o aviso
  return res.status(200).json({ ok: true });
}
