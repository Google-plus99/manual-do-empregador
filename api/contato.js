// api/contato.js
// Salva no Supabase os formulários do site: "Fale com um especialista" e a lista de espera dos cursos.
// A página abre o WhatsApp de qualquer forma; esta gravação é um registro extra.

import { inserir, supabaseAtivo } from "./_supabase.js";

const limpar = (s, max) => String(s || "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }
  const b = req.body || {};
  // Campo invisível: robôs preenchem, pessoas não
  if (b.site) return res.status(200).json({ ok: true });

  // De onde veio o contato: formulário geral ou lista de espera dos cursos
  const origem = ["site", "cursos"].includes(b.origem) ? b.origem : "site";
  const nome = limpar(b.nome, 120), email = limpar(b.email, 160), whatsapp = limpar(b.whats, 30), mensagem = limpar(b.msg, 2000);
  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.replace(/\D/g, "").length < 10) {
    return res.status(400).json({ erro: "Dados incompletos." });
  }
  if (!supabaseAtivo()) return res.status(200).json({ ok: true, salvo: false });

  try {
    await inserir("contatos", { nome, email, whatsapp, mensagem: mensagem || null, origem });
    return res.status(200).json({ ok: true, salvo: true });
  } catch (e) {
    console.error("Falha ao salvar contato:", e.message);
    return res.status(500).json({ erro: "Não foi possível salvar." });
  }
}
