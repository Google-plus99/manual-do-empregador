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
const primeiroNome = n => String(n || "").trim().split(/\s+/)[0] || "";
const linkWhats = w => { const z = String(w || "").replace(/\D/g, ""); return z ? `https://wa.me/${z.length <= 11 ? "55" + z : z}` : ""; };

// =====================================================================
// PADRÃO VISUAL DOS E-MAILS (09/11/2026): as cores do site, em tabelas com
// estilos em linha (o Gmail ignora CSS externo). Todos os e-mails usam moldura().
// =====================================================================
const COR = { fundo: "#140a0b", vinho: "#3c181a", cartao: "#250f10", dourado: "#c9a84c", texto: "#ffffff", suave: "#cbb9ba", linha: "#4a2a2d", zap: "#25d366" };
const LOGO_SIMBOLO = "https://institutofelipelopes.com.br/assets/img/logo-ifl-simbolo.png";
const F = "font-family:Arial,Helvetica,sans-serif";

const rotuloDourado = t => `<div style="${F};color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">${t}</div>`;
const paragrafo = (t, extra = "") => `<p style="${F};margin:0 0 12px;color:${COR.texto};font-size:15px;line-height:1.6;${extra}">${t}</p>`;
const nota = t => `<p style="${F};margin:0 0 10px;color:${COR.suave};font-size:13px;line-height:1.6">${t}</p>`;
const linkClaro = (href, t) => `<a href="${esc(href)}" style="color:${COR.texto};text-decoration:underline">${esc(t)}</a>`;
const destaque = t => `<div style="${F};background:${COR.vinho};border-left:3px solid ${COR.dourado};color:${COR.texto};font-size:15px;line-height:1.6;padding:14px 16px;white-space:pre-wrap">${t}</div>`;

// tipo "vinho" (padrão dos botões do site) ou "zap" (verde do WhatsApp)
function botao(href, t, tipo = "vinho", bloco = false) {
  const [fundo, borda] = tipo === "zap" ? [COR.zap, COR.zap] : [COR.vinho, COR.dourado];
  return `<a href="${esc(href)}" style="display:${bloco ? "block" : "inline-block"};${F};background:${fundo};color:#ffffff;border:2px solid ${borda};text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-align:center;padding:13px 22px;margin:0 8px 10px 0">${t}</a>`;
}

// linhas: [[rótulo, valor em HTML], ...]
function tabela(linhas) {
  const td = `${F};padding:12px 0;border-bottom:1px solid ${COR.linha};vertical-align:top`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COR.linha}">${linhas.map(([r, v]) =>
    `<tr><td style="${td};padding-right:16px;color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;width:120px">${r}</td><td style="${td};color:${COR.texto};font-size:15px">${v}</td></tr>`).join("")}</table>`;
}

// Moldura comum: topo vinho com o símbolo, filete dourado, título, blocos e rodapé
function moldura({ sobretitulo, titulo, intro, blocos = [], logo = LOGO_SIMBOLO }) {
  const linha = (conteudo, pad = "20px 32px 4px") => `<tr><td style="padding:${pad}">${conteudo}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COR.fundo}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COR.cartao};border:1px solid ${COR.linha}">
  <tr><td style="background:${COR.vinho};padding:26px 32px;border-bottom:3px solid ${COR.dourado}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle"><img src="${esc(logo)}" width="40" height="48" alt="" style="display:block;border:0"></td>
      <td style="${F};vertical-align:middle;color:${COR.texto};font-size:12px;font-weight:bold;letter-spacing:4px;line-height:1.5">INSTITUTO<br>FELIPE LOPES</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:30px 32px 6px">
    ${sobretitulo ? `<div style="${F};color:${COR.dourado};font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">${sobretitulo}</div>` : ""}
    <h1 style="${F};margin:8px 0 6px;color:${COR.texto};font-size:26px;line-height:1.2;text-transform:uppercase;letter-spacing:1px">${titulo}</h1>
    ${intro ? `<p style="${F};margin:0;color:${COR.suave};font-size:14px;line-height:1.6">${intro}</p>` : ""}
  </td></tr>
  ${blocos.filter(Boolean).map(b => linha(b)).join("\n  ")}
  <tr><td style="padding:12px 32px 16px"></td></tr>
  <tr><td style="${F};background:${COR.vinho};padding:16px 32px;color:${COR.suave};font-size:11px;letter-spacing:1px;text-align:center">Instituto Felipe Lopes · institutofelipelopes.com.br</td></tr>
</table>
</td></tr></table></body></html>`;
}

// ---------------------------------------------------------------------
// Entrega ao comprador (e-books e simulador)
// ---------------------------------------------------------------------
export function htmlEntrega({ nome, oferta, downloads = [], licenca, linkSimulador, whatsapp, logo }) {
  const blocos = [];
  const arquivos = downloads.filter(d => d.url);
  if (arquivos.length) blocos.push(rotuloDourado("E-books") + nota("Os links valem por 7 dias. Baixe e guarde os arquivos.") +
    arquivos.map(d => botao(d.url, "Baixar " + esc(d.titulo), "vinho", true)).join(""));
  if (licenca) {
    const abrir = `${linkSimulador}?chave=${encodeURIComponent(licenca.chave)}`;
    blocos.push(rotuloDourado("Simulador Tributário Regime Certo") +
      tabela([["Licença", esc(licenca.numero)], ["Válida até", esc(dataBR(licenca.vencimento))], ["Titular", esc(licenca.titular)]]) +
      `<div style="height:16px"></div>` + botao(abrir, "Abrir o simulador", "vinho", true) +
      `<div style="${F};color:${COR.suave};font-size:13px;margin:8px 0">Sua chave de licença (guarde este e-mail):</div>` +
      `<div style="font-family:Consolas,Menlo,monospace;font-size:12px;background:${COR.vinho};border-left:3px solid ${COR.dourado};color:${COR.texto};padding:12px 14px;word-break:break-all">${esc(licenca.chave)}</div>` +
      `<div style="height:10px"></div>` + nota(`O botão acima já abre o simulador com a chave preenchida. Em outro computador, abra ${esc(linkSimulador)} e cole a chave.`));
  }
  const zap = whatsapp ? `https://wa.me/${whatsapp}` : "";
  blocos.push(nota(`Alguma dificuldade? ${zap ? `Fale conosco pelo ${linkClaro(zap, "WhatsApp")} ou responda este e-mail.` : "Responda este e-mail."}`));
  return moldura({ logo, sobretitulo: "Compra confirmada", titulo: `${esc(primeiroNome(nome) || "Olá")}, seu acesso está liberado`,
    intro: `Obrigado por comprar <b style="color:${COR.texto}">${esc(oferta)}</b>. Abaixo está tudo o que você precisa para acessar.`, blocos });
}

function textoEntrega({ nome, oferta, downloads = [], licenca, linkSimulador, whatsapp }) {
  let t = `${primeiroNome(nome) || "Olá"}, sua compra foi confirmada.\nObrigado por comprar ${oferta}.\n\n`;
  const arquivos = downloads.filter(d => d.url);
  if (arquivos.length) t += "E-BOOKS (links válidos por 7 dias):\n" + arquivos.map(d => `${d.titulo}: ${d.url}`).join("\n") + "\n\n";
  if (licenca) t += `SIMULADOR TRIBUTÁRIO\nLicença nº ${licenca.numero}, válida até ${dataBR(licenca.vencimento)}.\nAbrir: ${linkSimulador}?chave=${encodeURIComponent(licenca.chave)}\nChave: ${licenca.chave}\n\n`;
  const zap = whatsapp ? `https://wa.me/${whatsapp}` : "";
  return t + `Alguma dificuldade? ${zap ? "WhatsApp: " + zap + " ou " : ""}responda este e-mail.\nInstituto Felipe Lopes`;
}

// ---------------------------------------------------------------------
// Consultoria: confirmação da contratação e próximo passo (agendar a primeira reunião)
// ---------------------------------------------------------------------
const linkAgendar = (whatsapp, oferta, servico) => whatsapp
  ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Contratei a ${oferta} (${servico}) pelo site e quero agendar a primeira reunião.`)}` : "";

export function htmlServico({ nome, oferta, servico, whatsapp, logo }) {
  const zap = linkAgendar(whatsapp, oferta, servico);
  return moldura({ logo, sobretitulo: "Consultoria para empresas", titulo: `${esc(primeiroNome(nome) || "Olá")}, sua consultoria foi confirmada`,
    intro: `Obrigado por contratar a <b style="color:${COR.texto}">${esc(oferta)}</b> (${esc(servico)}).`,
    blocos: [
      rotuloDourado("Próximo passo") + destaque("A equipe do Instituto vai entrar em contato pelo WhatsApp informado na compra para agendar a primeira reunião, em que entendemos o seu negócio, os objetivos e os principais desafios trabalhistas."),
      zap && paragrafo("Se preferir, adiante o agendamento agora:", `color:${COR.suave};font-size:14px`) + botao(zap, "Agendar pelo WhatsApp", "zap"),
      nota("Dúvidas? Responda este e-mail."),
    ] });
}

function textoServico({ nome, oferta, servico, whatsapp }) {
  const zap = linkAgendar(whatsapp, oferta, servico);
  return `${primeiroNome(nome) || "Olá"}, sua consultoria foi confirmada.\nObrigado por contratar a ${oferta} (${servico}).\n\nPRÓXIMO PASSO\nA equipe do Instituto vai entrar em contato pelo WhatsApp informado na compra para agendar a primeira reunião.\n${zap ? "Se preferir, adiante o agendamento: " + zap + "\n" : ""}\nDúvidas? Responda este e-mail.\nInstituto Felipe Lopes`;
}

function montar(dados) {
  return dados.servico ? { html: htmlServico(dados), texto: textoServico(dados) } : { html: htmlEntrega(dados), texto: textoEntrega(dados) };
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

export function htmlContato({ nome, email, whatsapp, mensagem, origem, logo }) {
  const zap = linkWhats(whatsapp);
  return moldura({ logo, sobretitulo: esc(TITULO_ORIGEM[origem] || origem), titulo: "Novo contato pelo site",
    intro: `${esc(primeiroNome(nome))} preencheu o formulário e aguarda o retorno da equipe.`,
    blocos: [
      tabela([["Nome", esc(nome)], ["E-mail", linkClaro("mailto:" + email, email)], ["WhatsApp", zap ? linkClaro(zap, whatsapp) : esc(whatsapp)]]),
      mensagem && rotuloDourado("Mensagem") + destaque(esc(mensagem)),
      botao("mailto:" + email, "Responder por e-mail") + (zap ? botao(zap, "Chamar no WhatsApp", "zap") : ""),
      nota(`Você também pode usar o botão Responder do Gmail: a resposta vai direto para ${esc(email)}.`),
    ] });
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
export function htmlVenda({ idPagamento, nome, email, whatsapp, oferta, detalhe, valor, forma, logo }) {
  const zap = linkWhats(whatsapp);
  const valorBR = Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return moldura({ logo, sobretitulo: "Venda pelo site", titulo: "Consultoria vendida",
    intro: `${esc(primeiroNome(nome))} contratou um pacote de consultoria e aguarda o agendamento da primeira reunião.`,
    blocos: [
      tabela([["Pacote", `${esc(oferta)}<br><span style="color:${COR.suave};font-size:13px">${esc(detalhe)}</span>`],
        ["Valor", `<b>${esc(valorBR)}</b><br><span style="color:${COR.suave};font-size:13px">${esc(forma)}</span>`],
        ["Cliente", esc(nome)], ["E-mail", linkClaro("mailto:" + email, email)],
        ["WhatsApp", zap ? linkClaro(zap, whatsapp) : "não informado"], ["Pagamento", esc(idPagamento)]]),
      rotuloDourado("Próximo passo") + destaque("Entrar em contato com o cliente para agendar a primeira reunião."),
      (zap ? botao(zap, "Chamar no WhatsApp", "zap") : "") + botao("mailto:" + email, "Responder por e-mail"),
    ] });
}

export async function enviarAvisoVenda({ idPagamento, nome, email, whatsapp, oferta, detalhe, valor, forma }) {
  if (!emailAtivo()) return false;
  const linkZap = linkWhats(whatsapp);
  const valorBR = Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const html = htmlVenda({ idPagamento, nome, email, whatsapp, oferta, detalhe, valor, forma });
  const texto = `Consultoria vendida pelo site\nPacote: ${oferta} (${detalhe})\nValor: ${valorBR}, ${forma}\nCliente: ${nome}\nE-mail: ${email}\nWhatsApp: ${whatsapp || "não informado"}${linkZap ? " (" + linkZap + ")" : ""}\nPagamento: ${idPagamento}\n\nPróximo passo: agendar a primeira reunião.`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `venda-${idPagamento}` },
    body: JSON.stringify({ from: remetente(), to: [DESTINO_CONTATOS()], reply_to: email || undefined, subject: `Consultoria vendida: ${oferta}, ${nome}`, html, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}
