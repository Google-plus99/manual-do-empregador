// servidor/rotas/webhook.js  (/api/webhook)
// O Mercado Pago chama este endereço quando o status de um pagamento muda.
// Atualiza o pedido no Supabase e, se aprovado, emite a licença e manda o e-mail,
// mesmo que o cliente tenha fechado a página antes da confirmação.

import { consultarPagamento, processarPagamento } from "../pedidos.js";
import { json, lerCorpo, enderecoSite } from "../ambiente.js";

export default async function webhook(request) {
  try {
    const q = new URL(request.url).searchParams;
    const b = request.method === "POST" ? await lerCorpo(request) : {};
    const tipo = b?.type || q.get("type") || q.get("topic");
    const id = String(b?.data?.id || q.get("data.id") || q.get("id") || "").replace(/\D/g, "");
    if (tipo === "payment" && id) {
      // Nunca confiar no conteúdo do aviso: sempre consultar o pagamento direto no Mercado Pago
      const p = await consultarPagamento(id);
      if (p) {
        await processarPagamento(p, enderecoSite(request));
        console.log(`[PIX] ${p.external_reference} | pagamento ${p.id} | ${p.status} | R$ ${p.transaction_amount}`);
      }
    }
  } catch (e) {
    console.error("Erro no webhook:", e?.stack || e);
  }
  // Sempre responde 200 para o Mercado Pago não ficar reenviando o aviso
  return json({ ok: true });
}
