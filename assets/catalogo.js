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
//   de      → preço "de" riscado (opcional)
//   upgrade → oferta sugerida na janela de compra para completar o pedido (opcional)

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
};

export const OFERTAS = {
  manual: {
    nome: "Manual do Empregador",
    descricao: "E-book Manual do Empregador (PDF)",
    itens: ["manual"],
    preco: 47,
    de: 97,
    upgrade: "combo-gestao",
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
    upgrade: "combo-gestao",
  },
  // Único combo: Manual do Empregador + Simulador Tributário
  "combo-gestao": {
    nome: "Combo Gestão Segura",
    descricao: `Manual do Empregador (PDF) + Simulador Tributário Regime Certo (licença ${LICENCA_MESES} meses)`,
    itens: ["manual", "simulador"],
    preco: 117,
  },
};

// Soma dos produtos avulsos de um combo (para mostrar a economia)
export function somaAvulsa(idOferta) {
  return OFERTAS[idOferta].itens.reduce((t, p) => t + (OFERTAS[p]?.preco || 0), 0);
}
