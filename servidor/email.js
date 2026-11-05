// servidor/email.js
// Envia ao comprador, por e-mail, o que ele comprou: links dos PDFs e chave de licença.
// Usa o Resend (resend.com) pela API REST, sem dependências.
// Endereço único do Instituto: contatos@institutofelipelopes.com.br (decidido em 05/11/2026).
// Os e-mails saem dele, as respostas dos clientes voltam para ele e os avisos do formulário
// chegam nele. A caixa é recebida pelo Email Routing da Cloudflare (encaminha para o Gmail).
// Variáveis no painel da Cloudflare:
//   RESEND_API_KEY   chave da API do Resend (sem ela, nada é enviado e a venda segue normalmente)
//   EMAIL_REMETENTE  não é mais usada; pode ser apagada do painel
//   EMAIL_CONTATOS   (opcional) troca o endereço único acima, se um dia for preciso

import { ENV } from "./ambiente.js";

const NOME_REMETENTE = "Instituto Felipe Lopes";
export const EMAIL_OFICIAL = () => String(ENV.EMAIL_CONTATOS || "contatos@institutofelipelopes.com.br").trim();
export const DESTINO_CONTATOS = EMAIL_OFICIAL;

// Nome que o cliente vê como remetente: sempre "Instituto Felipe Lopes <contatos@...>"
export const remetente = () => `${NOME_REMETENTE} <${EMAIL_OFICIAL()}>`;

export const emailAtivo = () => Boolean(ENV.RESEND_API_KEY);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = iso => String(iso || "").slice(0, 10).split("-").reverse().join("/");

function montar({ nome, oferta, downloads = [], licenca, linkSimulador, whatsapp }) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "Olá";
  const vinho = "#3c181a";
  const botao = (href, texto) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${vinho};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;margin:4px 0">${esc(texto)}</a>`;

  let html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2627;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:13px;letter-spacing:2px;color:${vinho};font-weight:bold;margin:0 0 18px">INSTITUTO FELIPE LOPES</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(primeiro)}, sua compra foi confirmada</h1>
  <p>Obrigado por comprar <b>${esc(oferta)}</b>. Abaixo está tudo o que você precisa para acessar.</p>`;
  let texto = `${primeiro}, sua compra foi confirmada.\nObrigado por comprar ${oferta}.\n\n`;

  if (downloads.length) {
    html += `<h2 style="font-size:17px;margin:26px 0 8px">E-books</h2><p style="margin:0 0 8px">Os links valem por 7 dias. Baixe e guarde os arquivos.</p>`;
    texto += "E-BOOKS (links válidos por 7 dias):\n";
    for (const d of downloads) {
      if (!d.url) continue;
      html += `<p style="margin:6px 0">${botao(d.url, "Baixar " + d.titulo)}</p>`;
      texto += `${d.titulo}: ${d.url}\n`;
    }
    texto += "\n";
  }

  if (licenca) {
    const abrir = `${linkSimulador}?chave=${encodeURIComponent(licenca.chave)}`;
    html += `<h2 style="font-size:17px;margin:26px 0 8px">Simulador Tributário Regime Certo</h2>
  <p style="margin:0 0 8px">Licença nº <b>${esc(licenca.numero)}</b>, válida até <b>${esc(dataBR(licenca.vencimento))}</b>, em nome de ${esc(licenca.titular)}.</p>
  <p style="margin:6px 0">${botao(abrir, "Abrir o simulador")}</p>
  <p style="margin:14px 0 6px">Sua chave de licença (guarde este e-mail):</p>
  <div style="font-family:Consolas,Menlo,monospace;font-size:12px;background:#f4f2f2;padding:12px;word-break:break-all">${esc(licenca.chave)}</div>
  <p style="font-size:13px;color:#625a5c">O botão acima já abre o simulador com a chave preenchida. Em outro computador, abra ${esc(linkSimulador)} e cole a chave.</p>`;
    texto += `SIMULADOR TRIBUTÁRIO\nLicença nº ${licenca.numero}, válida até ${dataBR(licenca.vencimento)}.\nAbrir: ${abrir}\nChave: ${licenca.chave}\n\n`;
  }

  const zap = whatsapp ? `https://wa.me/${whatsapp}` : "";
  html += `<p style="margin-top:28px;font-size:13px;color:#625a5c">Alguma dificuldade? ${zap ? `Fale conosco pelo <a href="${zap}" style="color:${vinho}">WhatsApp</a> ou responda este e-mail.` : "Responda este e-mail."}</p>
  <p style="font-size:13px;color:#625a5c">Instituto Felipe Lopes</p></div>`;
  texto += `Alguma dificuldade? ${zap ? "WhatsApp: " + zap + " ou " : ""}responda este e-mail.\nInstituto Felipe Lopes`;
  return { html, texto };
}

export async function enviarEntrega({ para, idPagamento, ...dados }) {
  if (!emailAtivo() || !para) return false;
  const { html, texto } = montar(dados);
  const corpo = {
    from: remetente(),
    to: [para],
    subject: `Seu acesso: ${dados.oferta}`,
    html, text: texto,
  };
  corpo.reply_to = EMAIL_OFICIAL();
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // O mesmo pagamento nunca gera dois e-mails, mesmo se o aviso chegar duas vezes
      "Idempotency-Key": `entrega-${idPagamento}`,
    },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}

// ---------------------------------------------------------------------
// Aviso de novo contato pelos formulários do site (página inicial, cursos e consultoria).
// Vai para o endereço único (contatos@institutofelipelopes.com.br), com
// "responder para" no e-mail do visitante: basta clicar em Responder.
// ---------------------------------------------------------------------

const TITULO_ORIGEM = {
  site: "Fale com a equipe (site)",
  cursos: "Lista de espera dos cursos",
  consultoria: "Consultoria para empresas",
};

export async function enviarContato({ nome, email, whatsapp, mensagem, origem }) {
  if (!emailAtivo()) return false;
  const vinho = "#3c181a";
  const assunto = `Novo contato: ${TITULO_ORIGEM[origem] || "site"}, ${nome}`;
  const zap = String(whatsapp || "").replace(/\D/g, "");
  const linkZap = zap ? `https://wa.me/${zap.length <= 11 ? "55" + zap : zap}` : "";
  const linha = (rotulo, valor) => `<tr><td style="padding:6px 12px 6px 0;color:#625a5c;vertical-align:top">${rotulo}</td><td style="padding:6px 0">${valor}</td></tr>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2627;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:13px;letter-spacing:2px;color:${vinho};font-weight:bold;margin:0 0 18px">INSTITUTO FELIPE LOPES</p>
  <h1 style="font-size:20px;margin:0 0 14px">Novo contato pelo site</h1>
  <table style="border-collapse:collapse;font-size:15px">
  ${linha("Formulário", esc(TITULO_ORIGEM[origem] || origem))}
  ${linha("Nome", esc(nome))}
  ${linha("E-mail", `<a href="mailto:${esc(email)}" style="color:${vinho}">${esc(email)}</a>`)}
  ${linha("WhatsApp", linkZap ? `<a href="${linkZap}" style="color:${vinho}">${esc(whatsapp)}</a>` : esc(whatsapp))}
  </table>
  ${mensagem ? `<h2 style="font-size:16px;margin:22px 0 8px">Mensagem</h2><div style="white-space:pre-wrap;background:#f4f2f2;padding:12px">${esc(mensagem)}</div>` : ""}
  <p style="margin-top:24px;font-size:13px;color:#625a5c">Para responder, use o botão Responder: a resposta vai direto para ${esc(email)}.</p></div>`;
  const texto = `Novo contato pelo site\nFormulário: ${TITULO_ORIGEM[origem] || origem}\nNome: ${nome}\nE-mail: ${email}\nWhatsApp: ${whatsapp}${linkZap ? " (" + linkZap + ")" : ""}\n` + (mensagem ? `\nMensagem:\n${mensagem}\n` : "");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente(), to: [DESTINO_CONTATOS()], reply_to: email, subject: assunto, html, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}
