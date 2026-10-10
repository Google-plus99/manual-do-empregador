// servidor/rotas/contato.js  (POST /api/contato)
// Salva no Supabase os formulários do site: "Fale com um especialista" e a lista de espera dos cursos.
// A página abre o WhatsApp de qualquer forma; esta gravação é um registro extra.

import { inserir, supabaseAtivo } from "../supabase.js";
import { json, lerCorpo } from "../ambiente.js";

const limpar = (s, max) => String(s || "").trim().slice(0, max);

export default async function contato(request) {
  const b = await lerCorpo(request);
  // Campo invisível: robôs preenchem, pessoas não
  if (b.site) return json({ ok: true });

  // De onde veio o contato: formulário geral ou lista de espera dos cursos
  const origem = ["site", "cursos"].includes(b.origem) ? b.origem : "site";
  const nome = limpar(b.nome, 120), email = limpar(b.email, 160), whatsapp = limpar(b.whats, 30), mensagem = limpar(b.msg, 2000);
  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.replace(/\D/g, "").length < 10) {
    return json({ erro: "Dados incompletos." }, 400);
  }
  if (!supabaseAtivo()) return json({ ok: true, salvo: false });

  try {
    await inserir("contatos", { nome, email, whatsapp, mensagem: mensagem || null, origem });
    return json({ ok: true, salvo: true });
  } catch (e) {
    console.error("Falha ao salvar contato:", e.message);
    return json({ erro: "Não foi possível salvar." }, 500);
  }
}
