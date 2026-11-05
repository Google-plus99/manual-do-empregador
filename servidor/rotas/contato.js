// servidor/rotas/contato.js  (POST /api/contato)
// Formulários do site: "Fale com a equipe", lista de espera dos cursos e consultoria.
// 1) grava no Supabase (tabela contatos); 2) avisa por e-mail em contatos@ (EMAIL_CONTATOS),
// com "responder para" no e-mail do visitante. A página abre o WhatsApp de qualquer forma.
// Uma falha em um dos dois não impede o outro.

import { inserir, supabaseAtivo } from "../supabase.js";
import { enviarContato } from "../email.js";
import { json, lerCorpo } from "../ambiente.js";

const limpar = (s, max) => String(s || "").trim().slice(0, max);

export default async function contato(request) {
  const b = await lerCorpo(request);
  // Campo invisível: robôs preenchem, pessoas não
  if (b.site) return json({ ok: true });

  // De onde veio o contato: formulário geral, lista de espera dos cursos ou consultoria
  const origem = ["site", "cursos", "consultoria"].includes(b.origem) ? b.origem : "site";
  const nome = limpar(b.nome, 120), email = limpar(b.email, 160), whatsapp = limpar(b.whats, 30), mensagem = limpar(b.msg, 2000);
  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.replace(/\D/g, "").length < 10) {
    return json({ erro: "Dados incompletos." }, 400);
  }

  const [gravacao, aviso] = await Promise.allSettled([
    supabaseAtivo() ? inserir("contatos", { nome, email, whatsapp, mensagem: mensagem || null, origem }).then(() => true) : Promise.resolve(false),
    enviarContato({ nome, email, whatsapp, mensagem, origem }),
  ]);
  if (gravacao.status === "rejected") console.error("Falha ao salvar contato:", gravacao.reason?.message);
  if (aviso.status === "rejected") console.error("Falha ao avisar contato por e-mail:", aviso.reason?.message);

  const salvo = gravacao.status === "fulfilled" && gravacao.value === true;
  const avisado = aviso.status === "fulfilled" && aviso.value === true;
  if (!salvo && !avisado && (gravacao.status === "rejected" || aviso.status === "rejected")) {
    return json({ erro: "Não foi possível registrar." }, 500);
  }
  return json({ ok: true, salvo: salvo || avisado, avisado });
}
