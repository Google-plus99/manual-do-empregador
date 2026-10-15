// assets/catalogo.js
// CATÁLOGO ÚNICO do Instituto Felipe Lopes.
// Este arquivo é lido pelas páginas (preços e textos) e pelo servidor (valor cobrado no Pix
// e o que é entregue após o pagamento). Mude preços SÓ AQUI.
//
// PRODUTOS: o que existe para entregar.
//   tipo "pdf"     → o comprador recebe um link temporário para baixar o arquivo
//                    guardado no Supabase (bucket "produtos", nome em `arquivo`).
//   tipo "licenca" → o comprador recebe a chave de licença do simulador.
//
// OFERTAS: o que se vende (um produto sozinho ou um combo).
//   itens   → produtos entregues
//   preco   → valor cobrado
//   de      → preço "de" riscado (opcional): valor previsto depois do lançamento
//
// Preços de LANÇAMENTO (definidos em 13/10/2026). O site mostra "Condição de lançamento"
// abaixo de cada preço; ao encerrar o lançamento, ajuste aqui e tire a frase em LANCAMENTO
// (gerador das páginas) e em assets/app.js.

export const LICENCA_MESES = 12;

// Contato usado no site e no e-mail de entrega (DDI + DDD, só números)
export const WHATSAPP = "558198590139";

export const PRODUTOS = {
  manual: {
    nome: "Manual do Empregador",
    tipo: "pdf",
    arquivo: "manual-do-empregador.pdf",
    pagina: "manual-do-empregador.html",
  },
  cartilha: {
    nome: "Cartilha do Bom Fornecedor",
    tipo: "pdf",
    arquivo: "cartilha-do-bom-fornecedor.pdf",
    pagina: "cartilha-do-bom-fornecedor.html",
  },
  simulador: {
    nome: "Simulador Tributário Regime Certo",
    tipo: "licenca",
    pagina: "simulador-tributario.html",
  },
  advocacia: {
    nome: "Advocacia Empreendedora",
    tipo: "pdf",
    arquivo: "advocacia-empreendedora.pdf",
    pagina: "advocacia-empreendedora.html",
  },
};

export const OFERTAS = {
  manual: {
    nome: "Manual do Empregador",
    descricao: "E-book Manual do Empregador (PDF)",
    itens: ["manual"],
    preco: 47,
    de: 97,
  },
  cartilha: {
    nome: "Cartilha do Bom Fornecedor",
    descricao: "E-book Cartilha do Bom Fornecedor (PDF)",
    itens: ["cartilha"],
    preco: 37,
    de: 67,
  },
  simulador: {
    nome: "Simulador Tributário Regime Certo",
    descricao: `Simulador Tributário Regime Certo (licença ${LICENCA_MESES} meses)`,
    itens: ["simulador"],
    preco: 97,
    de: 147,
  },
  advocacia: {
    nome: "Advocacia Empreendedora",
    descricao: "E-book Advocacia Empreendedora (PDF)",
    itens: ["advocacia"],
    preco: 47,
    de: 97,
  },
};

// ---------------------------------------------------------------------
// DESCONTO POR QUANTIDADE (no lugar do antigo combo): ao levar 2 ou mais
// produtos no mesmo pedido, o pedido inteiro tem DESCONTO_KIT de desconto.
// Os "kits" abaixo são gerados sozinhos, um para cada combinação possível,
// com id "kit-<produtos na ordem do catálogo>", ex.: "kit-manual-simulador".
// ---------------------------------------------------------------------
export const DESCONTO_KIT = 0.15;
const ORDEM = Object.keys(PRODUTOS);
const centavos = v => Math.round(v * 100) / 100;

export function idKit(itens) {
  const lista = ORDEM.filter(p => itens.includes(p));
  return lista.length === 1 ? lista[0] : "kit-" + lista.join("-");
}

for (let m = 1; m < 1 << ORDEM.length; m++) {
  const itens = ORDEM.filter((_, i) => m & (1 << i));
  if (itens.length < 2) continue;
  const soma = itens.reduce((t, p) => t + OFERTAS[p].preco, 0);
  OFERTAS[idKit(itens)] = {
    nome: itens.length === ORDEM.length ? "Kit completo" : `Kit ${itens.length} produtos`,
    descricao: itens.map(p => OFERTAS[p].descricao).join(" + ") + ` (${Math.round(DESCONTO_KIT * 100)}% de desconto)`,
    itens,
    preco: centavos(soma * (1 - DESCONTO_KIT)),
    de: soma,
    kit: true,
  };
}

// Soma dos produtos avulsos de um kit (para mostrar a economia)
export function somaAvulsa(idOferta) {
  return OFERTAS[idOferta].itens.reduce((t, p) => t + (OFERTAS[p]?.preco || 0), 0);
}
