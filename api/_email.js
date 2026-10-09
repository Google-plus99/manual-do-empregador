// api/_email.js
// Envia ao comprador, por e-mail, o que ele comprou: links dos PDFs e chave de licença.
// Usa o Resend (resend.com) pela API REST, sem dependências.
// Variáveis na Vercel:
//   RESEND_API_KEY   chave da API do Resend
//   EMAIL_REMETENTE  ex.: Instituto Felipe Lopes <contato@institutofelipelopes.com.br>
//   EMAIL_RESPOSTA   (opcional) e-mail que recebe as respostas do cliente
// Sem RESEND_API_KEY, nada é enviado e a venda segue normalmente.

export const emailAtivo = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = iso => String(iso || "").slice(0, 10).split("-").reverse().join("/");

function montar({ nome, oferta, downloads = [], licenca, linkSimulador, whatsapp }) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "Olá";
  const vinho = "#6e1021";
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
    from: process.env.EMAIL_REMETENTE,
    to: [para],
    subject: `Seu acesso: ${dados.oferta}`,
    html, text: texto,
  };
  if (process.env.EMAIL_RESPOSTA) corpo.reply_to = process.env.EMAIL_RESPOSTA;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      // O mesmo pagamento nunca gera dois e-mails, mesmo se o aviso chegar duas vezes
      "Idempotency-Key": `entrega-${idPagamento}`,
    },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return true;
}
