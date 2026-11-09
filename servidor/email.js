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

function montar({ nome, oferta, servico, downloads = [], licenca, linkSimulador, whatsapp }) {
  if (servico) return montarServico({ nome, oferta, servico, whatsapp });
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

// Consultoria: confirmação da contratação e próximo passo (agendar a primeira reunião)
function montarServico({ nome, oferta, servico, whatsapp }) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "Olá";
  const vinho = "#3c181a";
  const msg = encodeURIComponent(`Olá! Contratei a ${oferta} (${servico}) pelo site e quero agendar a primeira reunião.`);
  const zap = whatsapp ? `https://wa.me/${whatsapp}?text=${msg}` : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2627;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:13px;letter-spacing:2px;color:${vinho};font-weight:bold;margin:0 0 18px">INSTITUTO FELIPE LOPES</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(primeiro)}, sua consultoria foi confirmada</h1>
  <p>Obrigado por contratar a <b>${esc(oferta)}</b> (${esc(servico)}).</p>
  <h2 style="font-size:17px;margin:26px 0 8px">Próximo passo</h2>
  <p>A equipe do Instituto vai entrar em contato pelo WhatsApp informado na compra para agendar a primeira reunião, em que entendemos o seu negócio, os objetivos e os principais desafios trabalhistas.</p>
  ${zap ? `<p>Se preferir, adiante o agendamento agora:</p><p style="margin:6px 0"><a href="${esc(zap)}" style="display:inline-block;background:${vinho};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px">Agendar pelo WhatsApp</a></p>` : ""}
  <p style="margin-top:28px;font-size:13px;color:#625a5c">Dúvidas? Responda este e-mail.</p>
  <p style="font-size:13px;color:#625a5c">Instituto Felipe Lopes</p></div>`;
  const texto = `${primeiro}, sua consultoria foi confirmada.\nObrigado por contratar a ${oferta} (${servico}).\n\nPRÓXIMO PASSO\nA equipe do Instituto vai entrar em contato pelo WhatsApp informado na compra para agendar a primeira reunião.\n${zap ? "Se preferir, adiante o agendamento: " + zap + "\n" : ""}\nDúvidas? Responda este e-mail.\nInstituto Felipe Lopes`;
  return { html, texto };
}

export async function enviarEntrega({ para, idPagamento, ...dados }) {
  if (!emailAtivo() || !para) return false;
  const { html, texto } = montar(dados);
  const corpo = {
    from: remetente(),
    to: [para],
    subject: dados.servico ? `Consultoria confirmada: ${dados.oferta}` : `Seu acesso: ${dados.oferta}`,
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

// Cores do Instituto (as mesmas do site): vinho, preto avinhado, dourado e branco
const COR = { fundo: "#140a0b", vinho: "#3c181a", cartao: "#250f10", dourado: "#c9a84c", texto: "#ffffff", suave: "#cbb9ba", linha: "#4a2a2d", zap: "#25d366" };
const LOGO_SIMBOLO = "https://institutofelipelopes.com.br/assets/img/logo-ifl-simbolo.png";

// Aviso de novo contato no padrão visual do Instituto (tabelas e estilos em linha, para o Gmail)
export function htmlContato({ nome, email, whatsapp, mensagem, origem, logo = LOGO_SIMBOLO }) {
  const zap = String(whatsapp || "").replace(/\D/g, "");
  const linkZap = zap ? `https://wa.me/${zap.length <= 11 ? "55" + zap : zap}` : "";
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "";
  const fonte = "font-family:Arial,Helvetica,sans-serif";
  const rotulo = t => `<td style="${fonte};padding:12px 16px 12px 0;border-bottom:1px solid ${COR.linha};color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;vertical-align:top;width:120px">${t}</td>`;
  const valor = v => `<td style="${fonte};padding:12px 0;border-bottom:1px solid ${COR.linha};color:${COR.texto};font-size:15px">${v}</td>`;
  const link = (href, t) => `<a href="${esc(href)}" style="color:${COR.texto};text-decoration:underline">${esc(t)}</a>`;
  const botao = (href, t, fundo, cor, borda) => `<a href="${esc(href)}" style="display:inline-block;${fonte};background:${fundo};color:${cor};border:2px solid ${borda};text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:13px 22px;margin:0 8px 10px 0">${t}</a>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COR.fundo}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COR.cartao};border:1px solid ${COR.linha}">
  <tr><td style="background:${COR.vinho};padding:26px 32px;border-bottom:3px solid ${COR.dourado}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle"><img src="${esc(logo)}" width="40" height="48" alt="" style="display:block;border:0"></td>
      <td style="${fonte};vertical-align:middle;color:${COR.texto};font-size:12px;font-weight:bold;letter-spacing:4px;line-height:1.5">INSTITUTO<br>FELIPE LOPES</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:30px 32px 6px">
    <div style="${fonte};color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">${esc(TITULO_ORIGEM[origem] || origem)}</div>
    <h1 style="${fonte};margin:8px 0 6px;color:${COR.texto};font-size:26px;line-height:1.2;text-transform:uppercase;letter-spacing:1px">Novo contato pelo site</h1>
    <p style="${fonte};margin:0;color:${COR.suave};font-size:14px;line-height:1.6">${esc(primeiro)} preencheu o formulário e aguarda o retorno da equipe.</p>
  </td></tr>
  <tr><td style="padding:16px 32px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COR.linha}">
      <tr>${rotulo("Nome")}${valor(esc(nome))}</tr>
      <tr>${rotulo("E-mail")}${valor(link("mailto:" + email, email))}</tr>
      <tr>${rotulo("WhatsApp")}${valor(linkZap ? link(linkZap, whatsapp) : esc(whatsapp))}</tr>
    </table>
  </td></tr>
  ${mensagem ? `<tr><td style="padding:20px 32px 4px">
    <div style="${fonte};color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Mensagem</div>
    <div style="${fonte};background:${COR.vinho};border-left:3px solid ${COR.dourado};color:${COR.texto};font-size:15px;line-height:1.6;padding:14px 16px;white-space:pre-wrap">${esc(mensagem)}</div>
  </td></tr>` : ""}
  <tr><td style="padding:24px 32px 8px">
    ${botao("mailto:" + email, "Responder por e-mail", COR.vinho, COR.texto, COR.dourado)}
    ${linkZap ? botao(linkZap, "Chamar no WhatsApp", COR.zap, "#ffffff", COR.zap) : ""}
  </td></tr>
  <tr><td style="${fonte};padding:8px 32px 28px;color:${COR.suave};font-size:12px;line-height:1.6">Você também pode usar o botão Responder do Gmail: a resposta vai direto para ${esc(email)}.</td></tr>
  <tr><td style="${fonte};background:${COR.vinho};padding:16px 32px;color:${COR.suave};font-size:11px;letter-spacing:1px;text-align:center">Instituto Felipe Lopes · institutofelipelopes.com.br</td></tr>
</table>
</td></tr></table></body></html>`;
}

export async function enviarContato({ nome, email, whatsapp, mensagem, origem }) {
  if (!emailAtivo()) return false;
  const assunto = `Novo contato: ${TITULO_ORIGEM[origem] || "site"}, ${nome}`;
  const zap = String(whatsapp || "").replace(/\D/g, "");
  const linkZap = zap ? `https://wa.me/${zap.length <= 11 ? "55" + zap : zap}` : "";
  const html = htmlContato({ nome, email, whatsapp, mensagem, origem });
  const texto = `Novo contato pelo site\nFormulário: ${TITULO_ORIGEM[origem] || origem}\nNome: ${nome}\nE-mail: ${email}\nWhatsApp: ${whatsapp}${linkZap ? " (" + linkZap + ")" : ""}\n` + (mensagem ? `\nMensagem:\n${mensagem}\n` : "");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente(), to: [DESTINO_CONTATOS()], reply_to: email, subject: assunto, html, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}

// ---------------------------------------------------------------------
// Aviso de venda da consultoria para a equipe (contatos@), com os dados para agendar.
// ---------------------------------------------------------------------
export async function enviarAvisoVenda({ idPagamento, nome, email, whatsapp, oferta, detalhe, valor, forma }) {
  if (!emailAtivo()) return false;
  const vinho = "#3c181a";
  const zap = String(whatsapp || "").replace(/\D/g, "");
  const linkZap = zap ? `https://wa.me/${zap.length <= 11 ? "55" + zap : zap}` : "";
  const valorBR = Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const linha = (r, v) => `<tr><td style="padding:6px 12px 6px 0;color:#625a5c;vertical-align:top">${r}</td><td style="padding:6px 0">${v}</td></tr>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2627;max-width:560px;margin:0 auto;line-height:1.55">
  <p style="font-size:13px;letter-spacing:2px;color:${vinho};font-weight:bold;margin:0 0 18px">INSTITUTO FELIPE LOPES</p>
  <h1 style="font-size:20px;margin:0 0 14px">Consultoria vendida pelo site</h1>
  <table style="border-collapse:collapse;font-size:15px">
  ${linha("Pacote", `${esc(oferta)} (${esc(detalhe)})`)}
  ${linha("Valor", `${esc(valorBR)}, ${esc(forma)}`)}
  ${linha("Cliente", esc(nome))}
  ${linha("E-mail", `<a href="mailto:${esc(email)}" style="color:${vinho}">${esc(email)}</a>`)}
  ${linha("WhatsApp", linkZap ? `<a href="${linkZap}" style="color:${vinho}">${esc(whatsapp)}</a>` : "não informado")}
  ${linha("Pagamento", esc(idPagamento))}
  </table>
  <p style="margin-top:22px"><b>Próximo passo:</b> entrar em contato com o cliente para agendar a primeira reunião.</p></div>`;
  const texto = `Consultoria vendida pelo site\nPacote: ${oferta} (${detalhe})\nValor: ${valorBR}, ${forma}\nCliente: ${nome}\nE-mail: ${email}\nWhatsApp: ${whatsapp || "não informado"}${linkZap ? " (" + linkZap + ")" : ""}\nPagamento: ${idPagamento}\n\nPróximo passo: agendar a primeira reunião.`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `venda-${idPagamento}` },
    body: JSON.stringify({ from: remetente(), to: [DESTINO_CONTATOS()], reply_to: email || undefined, subject: `Consultoria vendida: ${oferta}, ${nome}`, html, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}
