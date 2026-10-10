// assets/app.js
// Comportamento comum a todas as páginas do portal.
// Preços e produtos vêm de assets/catalogo.js. Dados de contato ficam no CONFIG abaixo.

import { OFERTAS, PRODUTOS, LICENCA_MESES, WHATSAPP, somaAvulsa } from "./catalogo.js";

/* ====================================================================
   CONFIG: dados de contato e identificação da empresa
   ==================================================================== */
const CONFIG = {
  // WhatsApp: definido em assets/catalogo.js (vale também para o e-mail de entrega)
  whatsapp: WHATSAPP,
  mensagemWhats: "Olá! Quero saber mais sobre os produtos do Instituto Felipe Lopes.",
  email: "",

  // Identificação exigida para vendas online (Decreto 7.962/2013). Preencha antes de publicar.
  empresa: { razao: "", cnpj: "", endereco: "" },

  // Forma de pagamento:
  //   "checkout"    = o cliente é levado à página do Mercado Pago para pagar (Checkout Pro)
  //   "pix-no-site" = o QR Code Pix aparece na própria página (Checkout Transparente)
  pagamento: "checkout",

  // Fora destes endereços, a compra entra em modo pré-visualização (pagamento simulado)
  dominiosReais: ["institutofelipelopes.com.br", "workers.dev"],
};
/* ==================================================================== */

const $ = id => document.getElementById(id);
const brl = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const textoLicenca = `${LICENCA_MESES} meses`;
const linkWhats = (msg = CONFIG.mensagemWhats) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const DEMO = !CONFIG.dominiosReais.some(d => location.hostname === d || location.hostname.endsWith("." + d));
const CHECKOUT = CONFIG.pagamento === "checkout";
const guardar = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const ler = k => { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (_) { return null; } };

/* ---------- entrega (usada na janela de compra e na página de retorno) ---------- */
function renderEntrega(s) {
  const caixa = $("entregas");
  caixa.innerHTML = "";
  (s.downloads || []).forEach(d => {
    const a = document.createElement("a");
    a.className = "btn";
    a.rel = "noopener"; a.target = "_blank";
    if (d.url) { a.href = d.url; a.textContent = `Baixar ${d.titulo}`; }
    else { a.href = linkWhats(`Olá! Paguei e preciso receber o arquivo ${d.titulo}.`); a.textContent = `Receber ${d.titulo} pelo WhatsApp`; }
    caixa.appendChild(a);
  });
  const temSim = OFERTAS[s.oferta]?.itens.includes("simulador");
  $("bloco-licenca").hidden = !(temSim && s.licenca);
  $("lic-erro").hidden = !(temSim && !s.licenca);
  if (temSim && s.licenca) {
    $("lic-numero").textContent = s.licenca.numero;
    $("lic-venc").textContent = String(s.licenca.vencimento).split("-").reverse().join("/");
    $("lic-chave").value = s.licenca.chave;
    $("btn-simulador").href = (s.link_simulador || "simulador/") + "?chave=" + encodeURIComponent(s.licenca.chave);
  }
  $("aviso-email").hidden = !s.email_enviado;
}
async function copiar(campo, btn, rotulo) {
  try { await navigator.clipboard.writeText(campo.value); }
  catch (_) { campo.select(); document.execCommand("copy"); }
  btn.textContent = "Copiado";
  setTimeout(() => (btn.textContent = rotulo), 2000);
}
const entregaDemo = id => {
  const o = OFERTAS[id];
  return {
    status: "approved", oferta: id,
    downloads: o.itens.filter(i => PRODUTOS[i].tipo === "pdf").map(i => ({ produto: i, titulo: PRODUTOS[i].nome, url: "#" })),
    licenca: o.itens.includes("simulador") ? { numero: "RC-261010-DEMO", vencimento: "2027-10-10", chave: "RC1.EXEMPLO-DE-CHAVE-GERADA-AUTOMATICAMENTE-APOS-O-PAGAMENTO" } : null,
  };
};

/* ---------- preços e textos do catálogo ---------- */
document.querySelectorAll("[data-preco]").forEach(el => (el.textContent = inteiro(OFERTAS[el.dataset.preco].preco)));
document.querySelectorAll("[data-preco-brl]").forEach(el => (el.textContent = brl(OFERTAS[el.dataset.precoBrl].preco)));
document.querySelectorAll("[data-de]").forEach(el => {
  const o = OFERTAS[el.dataset.de];
  const valor = o.de || (o.itens.length > 1 ? somaAvulsa(el.dataset.de) : 0);
  if (valor > o.preco) el.querySelector("span").textContent = brl(valor);
  else el.hidden = true;
});
document.querySelectorAll("[data-economia]").forEach(el => {
  const id = el.dataset.economia, eco = somaAvulsa(id) - OFERTAS[id].preco;
  if (eco > 0) el.querySelector("span").textContent = brl(eco); else el.hidden = true;
});
document.querySelectorAll("[data-licenca]").forEach(el => (el.textContent = textoLicenca));

/* ---------- WhatsApp e dados da empresa ---------- */
document.querySelectorAll(".js-whats").forEach(a => { a.href = linkWhats(); a.target = "_blank"; a.rel = "noopener"; });
const emp = CONFIG.empresa;
document.querySelectorAll("[data-empresa]").forEach(el => {
  const partes = [emp.razao, emp.cnpj && `CNPJ ${emp.cnpj}`, emp.endereco].filter(Boolean);
  if (partes.length) el.textContent = partes.join(", "); else el.hidden = true;
});
document.querySelectorAll("[data-email]").forEach(el => {
  if (CONFIG.email) { el.textContent = CONFIG.email; el.href = "mailto:" + CONFIG.email; } else el.hidden = true;
});

/* ---------- menu no celular ---------- */
(() => {
  const b = document.querySelector(".abrir-menu"), nav = document.querySelector(".topo nav");
  if (!b || !nav) return;
  b.addEventListener("click", () => {
    const aberto = nav.classList.toggle("aberto");
    b.setAttribute("aria-expanded", aberto);
  });
})();

/* ---------- carrossel da vitrine ---------- */
(() => {
  const trilho = $("trilho-c");
  if (!trilho) return;
  const slides = [...trilho.children];
  const abas = [...document.querySelectorAll(".abas-c button")];
  let atual = 0;
  function ir(i) {
    atual = (i + slides.length) % slides.length;
    trilho.style.transform = `translateX(-${atual * 100}%)`;
    slides.forEach((s, n) => { const fora = n !== atual; s.toggleAttribute("inert", fora); s.setAttribute("aria-hidden", fora); });
    abas.forEach((a, n) => a.setAttribute("aria-current", n === atual));
  }
  $("c-ant").addEventListener("click", () => ir(atual - 1));
  $("c-prox").addEventListener("click", () => ir(atual + 1));
  abas.forEach((a, n) => a.addEventListener("click", () => ir(n)));
  let x0 = null;
  trilho.addEventListener("touchstart", e => (x0 = e.touches[0].clientX), { passive: true });
  trilho.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  ir(0);
})();

/* ---------- depoimentos (faixa contínua) ---------- */
(() => {
  const t = $("trilho-depoimentos");
  if (!t) return;
  const originais = [...t.children];
  originais.forEach(c => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); t.appendChild(k); });
})();

/* ---------- formulários (contato e lista de espera) ---------- */
document.querySelectorAll("form[data-origem]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = form.elements, origem = form.dataset.origem;
    const interesses = [...form.querySelectorAll('input[name="interesse"]:checked')].map(i => i.value);
    const msg = [f.msg?.value, interesses.length ? `Interesse: ${interesses.join(", ")}` : ""].filter(Boolean).join("\n");
    const dados = { nome: f.nome.value, email: f.email.value, whats: f.whats.value, msg, site: f.site.value, origem };
    let salvo = false;
    if (location.protocol.startsWith("http") && !DEMO) {
      try {
        const r = await fetch("api/contato", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
        salvo = (await r.json()).salvo === true;
      } catch (_) {}
    }
    if (origem === "cursos" && (salvo || DEMO)) {
      form.hidden = true;
      form.nextElementSibling?.removeAttribute("hidden");
      return;
    }
    const texto = `Olá! ${origem === "cursos" ? "Quero ser avisado sobre os cursos do Instituto Felipe Lopes." : "Gostaria de falar com a equipe do Instituto Felipe Lopes."}\n\nNome: ${dados.nome}\nE-mail: ${dados.email}\nWhatsApp: ${dados.whats}` + (msg ? `\n\n${msg}` : "");
    window.open(linkWhats(texto), "_blank");
  });
});

/* ====================================================================
   COMPRA VIA PIX
   ==================================================================== */
const JANELA = `
<div class="modal" id="modal-pix" role="dialog" aria-modal="true" aria-labelledby="pix-titulo">
  <div class="janela">
    <button class="fechar" type="button" aria-label="Fechar" data-fechar>&times;</button>
    <div class="demo-aviso" id="demo-aviso" hidden>Pré-visualização: o pagamento é simulado. No site publicado, a cobrança é real.</div>

    <div class="etapa ativa" id="etapa-dados">
      <h3 id="pix-titulo">Finalizar compra</h3>
      <div class="pedido"><div class="pedido-topo"><span id="pix-nome"></span><strong id="pix-valor"></strong></div><ul id="pix-itens"></ul></div>
      <form id="form-pix" novalidate>
        <label>Nome completo <em>*</em><input name="nome" required autocomplete="name"></label>
        <label>E-mail <em>*</em><input name="email" type="email" required autocomplete="email"></label>
        <label id="campo-cpf">CPF <em>*</em><input name="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label>
        <label class="upgrade" id="upgrade" hidden><input type="checkbox" id="upgrade-check"><div><b id="upgrade-titulo"></b><span id="upgrade-texto"></span></div></label>
        <p class="erro" id="pix-erro" role="alert"></p>
        <button class="btn" type="submit" id="btn-gerar">Gerar QR Code Pix</button>
        <p class="aviso" id="aviso-pagamento">O CPF é exigido pelo Mercado Pago para emitir a cobrança Pix. A licença do simulador, quando incluída, sai no nome informado.</p>
      </form>
    </div>

    <div class="etapa" id="etapa-qr">
      <h3>Pague com Pix</h3>
      <p class="resumo">Valor: <strong id="pix-valor-2"></strong>, válido por <strong id="pix-tempo">30:00</strong></p>
      <img class="qr" id="pix-img" alt="QR Code Pix para pagamento">
      <label for="pix-codigo">Ou use o Pix copia e cola:</label>
      <div class="copia"><input id="pix-codigo" readonly><button type="button" id="btn-copiar">Copiar</button></div>
      <div class="aguardando" aria-live="polite"><i></i><span>Aguardando o pagamento...</span></div>
      <ol class="passos">
        <li>Abra o app do seu banco e escolha pagar com Pix.</li>
        <li>Escaneie o QR Code ou cole o código copiado.</li>
        <li>Confirme o pagamento. Esta tela atualiza sozinha.</li>
      </ol>
      <button class="btn-demo" type="button" id="btn-simular-pago" hidden>Pré-visualização: simular pagamento aprovado</button>
    </div>

    <div class="etapa ok" id="etapa-ok">
      <div class="icone" aria-hidden="true">✓</div>
      <h3>Pagamento confirmado</h3>
      <p class="resumo">Obrigado pela compra. Seu acesso já está liberado.</p>
      <div class="entregas" id="entregas"></div>
      <div class="licenca" id="bloco-licenca" hidden>
        <p><b>Sua licença do Simulador Regime Certo</b><br>Nº <span id="lic-numero"></span>, válida até <span id="lic-venc"></span></p>
        <textarea id="lic-chave" readonly aria-label="Chave de licença"></textarea>
        <div class="botoes">
          <button class="btn btn-contorno" type="button" id="btn-copiar-lic">Copiar chave</button>
          <a class="btn" id="btn-simulador" href="simulador/" target="_blank" rel="noopener">Abrir simulador</a>
        </div>
        <p class="aviso" style="margin-top:10px">Guarde esta chave. Você vai precisar dela se acessar o simulador em outro navegador.</p>
      </div>
      <p class="aviso" id="aviso-email" hidden>Também enviamos tudo para o seu e-mail. Confira a caixa de entrada e o spam.</p>
      <p class="aviso">Os links desta tela valem por 24 horas. Baixe e guarde os arquivos.</p>
      <p class="aviso" id="lic-erro" hidden style="margin-top:10px">Sua licença será enviada pelo WhatsApp em instantes.</p>
      <p class="aviso" style="margin-top:12px">Alguma dificuldade? <a class="js-whats-modal" href="#">Fale conosco pelo WhatsApp</a>.</p>
    </div>

    <div class="etapa" id="etapa-expirado">
      <h3>O Pix expirou</h3>
      <p class="resumo">O prazo para pagamento terminou. Gere um novo QR Code para continuar.</p>
      <button class="btn" type="button" id="btn-novo">Gerar novo Pix</button>
    </div>
  </div>
</div>`;

(() => {
  const botoesCompra = document.querySelectorAll("[data-comprar]");
  if (!botoesCompra.length) return;
  document.body.insertAdjacentHTML("beforeend", JANELA);
  document.querySelectorAll(".js-whats-modal").forEach(a => { a.href = linkWhats(); a.target = "_blank"; a.rel = "noopener"; });

  const modal = $("modal-pix"), form = $("form-pix"), erro = $("pix-erro"), btnGerar = $("btn-gerar");
  const upgrade = $("upgrade"), upgradeCheck = $("upgrade-check");
  let inicial = null, consulta = null, relogio = null, ultimoFoco = null;

  const rotuloBotao = CHECKOUT ? "Continuar para o pagamento" : "Gerar QR Code Pix";
  if (CHECKOUT) {
    $("campo-cpf").hidden = true;
    $("aviso-pagamento").textContent = "Você será levado ao site do Mercado Pago para pagar com Pix. Depois do pagamento, volta para cá e recebe o acesso, que também vai para o seu e-mail. A licença do simulador, quando incluída, sai no nome informado.";
  }
  btnGerar.textContent = rotuloBotao;

  const ofertaAtual = () => (upgradeCheck.checked && OFERTAS[inicial].upgrade) ? OFERTAS[inicial].upgrade : inicial;
  const nomesItens = itens => itens.map(i => PRODUTOS[i].nome);

  function atualizarResumo() {
    const id = ofertaAtual(), o = OFERTAS[id];
    $("pix-nome").textContent = o.nome;
    $("pix-valor").textContent = brl(o.preco);
    $("pix-itens").innerHTML = o.itens.length > 1 ? nomesItens(o.itens).map(n => `<li>${n}</li>`).join("") : "";
  }
  function etapa(id) { modal.querySelectorAll(".etapa").forEach(e => e.classList.toggle("ativa", e.id === id)); }
  function parar() { clearInterval(consulta); clearInterval(relogio); }

  function abrir(id) {
    inicial = id;
    upgradeCheck.checked = false;
    const up = OFERTAS[id].upgrade;
    upgrade.hidden = !up;
    if (up) {
      const novos = OFERTAS[up].itens.filter(i => !OFERTAS[id].itens.includes(i));
      $("upgrade-titulo").textContent = `Levar também ${nomesItens(novos).join(" e ")} por + ${brl(OFERTAS[up].preco - OFERTAS[id].preco)}`;
      $("upgrade-texto").textContent = `Seu pedido passa a ser o ${OFERTAS[up].nome}, por ${brl(OFERTAS[up].preco)} no total.`;
    }
    atualizarResumo();
    ultimoFoco = document.activeElement;
    etapa("etapa-dados"); erro.textContent = "";
    $("demo-aviso").hidden = !DEMO;
    modal.classList.add("aberto");
    document.body.style.overflow = "hidden";
    form.nome.focus();
  }
  function fechar() {
    parar();
    modal.classList.remove("aberto");
    document.body.style.overflow = "";
    ultimoFoco && ultimoFoco.focus();
  }

  botoesCompra.forEach(b => b.addEventListener("click", e => { e.preventDefault(); abrir(b.dataset.comprar); }));
  upgradeCheck.addEventListener("change", atualizarResumo);
  $("btn-novo").addEventListener("click", () => etapa("etapa-dados"));
  modal.addEventListener("click", e => { if (e.target === modal || e.target.hasAttribute("data-fechar")) fechar(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("aberto")) fechar(); });

  form.cpf.addEventListener("input", e => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = v;
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    erro.textContent = "";
    if (form.nome.value.trim().split(/\s+/).length < 2) { erro.textContent = "Informe nome e sobrenome."; return; }
    if (!form.email.value || !form.email.checkValidity()) { erro.textContent = "Informe um e-mail válido."; return; }
    if (!CHECKOUT && form.cpf.value.replace(/\D/g, "").length !== 11) { erro.textContent = "Informe o CPF completo."; return; }

    btnGerar.disabled = true; btnGerar.textContent = CHECKOUT ? "Abrindo o Mercado Pago..." : "Gerando Pix...";
    const dados = { nome: form.nome.value.trim(), email: form.email.value.trim(), cpf: form.cpf.value, oferta: ofertaAtual() };
    guardar("ifl-compra", { email: dados.email, oferta: dados.oferta });
    try {
      if (CHECKOUT) {
        // Checkout Pro: cria a preferência e leva o cliente à página do Mercado Pago
        if (DEMO) { await new Promise(r => setTimeout(r, 500)); location.href = `obrigado.html?demo=1&oferta=${encodeURIComponent(dados.oferta)}`; return; }
        const r = await fetch("api/criar-pagamento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
        const d = await r.json();
        if (!r.ok || !d.url) throw new Error(d.erro || "Não foi possível abrir o pagamento.");
        location.href = d.url;
        return;
      }
      if (DEMO) { await new Promise(r => setTimeout(r, 600)); mostrarQr(pixDemo(dados.oferta)); return; }
      const r = await fetch("api/criar-pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível gerar o Pix.");
      mostrarQr(d);
    } catch (err) {
      erro.textContent = err.message || "Não foi possível iniciar o pagamento. Tente novamente.";
    } finally {
      btnGerar.disabled = false; btnGerar.textContent = rotuloBotao;
    }
  });

  function mostrarQr(d) {
    $("pix-img").src = d.qr_code_base64.startsWith("data:") ? d.qr_code_base64 : "data:image/png;base64," + d.qr_code_base64;
    $("pix-codigo").value = d.qr_code;
    $("pix-valor-2").textContent = brl(d.valor);
    $("btn-simular-pago").hidden = !DEMO;
    etapa("etapa-qr");

    const fim = d.expira_em && !isNaN(new Date(d.expira_em)) ? new Date(d.expira_em).getTime() : Date.now() + 30 * 60000;
    const tic = () => {
      const s = Math.max(0, Math.round((fim - Date.now()) / 1000));
      $("pix-tempo").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      if (s === 0) { parar(); etapa("etapa-expirado"); }
    };
    parar(); tic(); relogio = setInterval(tic, 1000);
    if (DEMO) return;

    consulta = setInterval(async () => {
      try {
        const r = await fetch("api/status-pix?id=" + encodeURIComponent(d.id) + "&email=" + encodeURIComponent(form.email.value.trim()));
        const s = await r.json();
        if (s.status === "approved") { parar(); aprovado(s); }
        else if (["cancelled", "rejected", "expired"].includes(s.status)) { parar(); etapa("etapa-expirado"); }
      } catch (_) { /* tenta de novo na próxima rodada */ }
    }, 5000);
  }

  function aprovado(s) {
    renderEntrega(s);
    etapa("etapa-ok");
  }

  $("btn-copiar").addEventListener("click", () => copiar($("pix-codigo"), $("btn-copiar"), "Copiar"));
  $("btn-copiar-lic").addEventListener("click", () => copiar($("lic-chave"), $("btn-copiar-lic"), "Copiar chave"));

  /* ---------- pré-visualização (sem cobrança real) ---------- */
  function pixDemo(id) {
    let cel = "";
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      const canto = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
      const borda = canto && (x % 18 === 0 || y % 18 === 0 || x % 18 === 6 || y % 18 === 6 || (x % 18 > 1 && x % 18 < 5 && y % 18 > 1 && y % 18 < 5));
      if (canto ? borda : ((x * 7 + y * 13 + x * y) % 3 === 0)) cel += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 27 27"><rect x="-1" y="-1" width="27" height="27" fill="#fff"/><g fill="#2b2627">${cel}</g></svg>`;
    return { id: "demo", oferta: id, valor: OFERTAS[id].preco, qr_code_base64: "data:image/svg+xml;base64," + btoa(svg),
      qr_code: "00020126580014BR.GOV.BCB.PIX-EXEMPLO-DE-PRE-VISUALIZACAO", expira_em: new Date(Date.now() + 30 * 60000).toISOString() };
  }
  $("btn-simular-pago").addEventListener("click", () => { parar(); aprovado(entregaDemo(ofertaAtual())); });
})();

/* ====================================================================
   PÁGINA DE RETORNO DO MERCADO PAGO (obrigado.html)
   O Mercado Pago devolve o cliente com ?payment_id=...&status=...
   A página consulta o pagamento e mostra a entrega quando aprovado.
   ==================================================================== */
(() => {
  const pagina = $("pagina-obrigado");
  if (!pagina) return;
  const q = new URLSearchParams(location.search);
  const id = (q.get("payment_id") || q.get("collection_id") || "").replace(/\D/g, "");
  const salvo = ler("ifl-compra") || {};
  const estados = ["obg-carregando", "obg-pendente", "obg-aprovado", "obg-recusado", "obg-email"];
  const mostrar = e => estados.forEach(x => { const el = $(x); if (el) el.hidden = x !== e; });
  $("btn-copiar-lic").addEventListener("click", () => copiar($("lic-chave"), $("btn-copiar-lic"), "Copiar chave"));
  document.querySelectorAll(".js-whats-obg").forEach(a => { a.href = linkWhats("Olá! Fiz um pagamento no site do Instituto e preciso de ajuda com o acesso."); a.target = "_blank"; a.rel = "noopener"; });

  if (q.get("demo") && OFERTAS[q.get("oferta")]) {
    $("demo-obg").hidden = false;
    renderEntrega(entregaDemo(q.get("oferta")));
    mostrar("obg-aprovado");
    return;
  }
  if (!id) { mostrar("obg-recusado"); return; }

  let email = salvo.email || "";
  let tentativas = 0, timer = null;
  async function consultar() {
    tentativas++;
    try {
      const r = await fetch(`api/status-pix?id=${id}&email=${encodeURIComponent(email)}`, { cache: "no-store" });
      const s = await r.json();
      if (s.status === "approved") {
        if (s.confirme_email) { mostrar("obg-email"); return; }
        renderEntrega(s); mostrar("obg-aprovado"); return;
      }
      if (["rejected", "cancelled", "refunded", "charged_back"].includes(s.status)) { mostrar("obg-recusado"); return; }
      mostrar("obg-pendente");
    } catch (_) { mostrar("obg-pendente"); }
    if (tentativas < 120) timer = setTimeout(consultar, 5000); // até 10 minutos
  }
  $("form-confirma-email").addEventListener("submit", e => {
    e.preventDefault();
    email = e.target.email.value.trim();
    guardar("ifl-compra", { ...salvo, email });
    clearTimeout(timer); tentativas = 0; mostrar("obg-carregando"); consultar();
  });
  mostrar("obg-carregando");
  consultar();
})();
