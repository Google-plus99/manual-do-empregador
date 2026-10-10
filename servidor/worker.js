// servidor/worker.js
// Ponto de entrada na Cloudflare (Workers, plano gratuito).
// As páginas, imagens e o simulador são arquivos estáticos servidos direto pela Cloudflare.
// Só os endereços /api/... passam por aqui (ver "run_worker_first" em wrangler.jsonc).

import { definirAmbiente, json } from "./ambiente.js";
import criarPagamento from "./rotas/criar-pagamento.js";
import criarPix from "./rotas/criar-pix.js";
import statusPix from "./rotas/status-pix.js";
import webhook from "./rotas/webhook.js";
import contato from "./rotas/contato.js";

// método aceito por rota (null = qualquer)
const ROTAS = {
  "/api/criar-pagamento": [criarPagamento, "POST"],
  "/api/criar-pix": [criarPix, "POST"],
  "/api/status-pix": [statusPix, "GET"],
  "/api/webhook": [webhook, null],
  "/api/contato": [contato, "POST"],
};

export default {
  async fetch(request, env, ctx) {
    definirAmbiente(env);
    const caminho = new URL(request.url).pathname.replace(/\/$/, "");
    const rota = ROTAS[caminho];

    if (!rota) {
      if (caminho.startsWith("/api")) return json({ erro: "Endereço não encontrado." }, 404);
      return env.ASSETS.fetch(request);
    }
    const [funcao, metodo] = rota;
    if (metodo && request.method !== metodo) {
      return json({ erro: "Método não permitido." }, 405, { Allow: metodo });
    }
    try {
      return await funcao(request, ctx);
    } catch (e) {
      console.error(`Erro em ${caminho}:`, e?.stack || e);
      return json({ erro: "Erro interno." }, 500);
    }
  },
};
