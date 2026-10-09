# Instituto Felipe Lopes: portal de infoprodutos e cursos

Portal de vendas do **Instituto Felipe Lopes** (institutofelipelopes.com.br), com uma página por produto (Manual e Simulador oferecem o combo no fim; a Cartilha não). Hospedagem na **Vercel**, dados no **Supabase**, pagamento **Pix via Mercado Pago (Checkout Transparente)** com o QR Code exibido no próprio site. O repositório se chama `manual-do-empregador` por histórico: o projeto começou como a página de vendas desse e-book.

## Produtos

| Oferta (id) | O que entrega | Preço provisório |
|---|---|---|
| `manual` | PDF Manual do Empregador (Felipe Lopes e Lais Leite, 46 p.) | R$ 47 (de 97) |
| `cartilha` | PDF Cartilha do Bom Fornecedor (Felipe Lopes Advogados, 24 p.) | R$ 37 (de 67) |
| `simulador` | Licença do Simulador Regime Certo (Virgilio Calmon, co-autor) | R$ 97 |
| `combo-gestao` | Manual + Simulador (Combo Gestão Segura) | R$ 117 |

**Decisão:** os produtos são vendidos separados e o único combo é Manual + Simulador. A Cartilha é vendida só avulsa, sem combo nem oferta de upgrade.

**Fonte única de preços e entregas: `assets/catalogo.js`.** É importado pelas páginas (`assets/app.js`) e pelo servidor (`api/criar-pix.js`, `api/_pedidos.js`, `api/_licenca.js`). Para mudar preço, prazo da licença (`LICENCA_MESES`) ou criar produto/combo, altere só esse arquivo. Cada oferta pode ter `upgrade`, que aparece como sugestão na janela de compra.

Para um novo PDF: adicionar em `PRODUTOS` (tipo `pdf`, campo `arquivo`), criar a oferta em `OFERTAS`, enviar o PDF ao bucket `produtos` do Supabase com o mesmo nome e criar a página do produto.

## Estrutura

- Páginas (HTML estático, sem build; topo e rodapé repetidos em cada arquivo, ao mudar o menu altere todos):
  - `index.html`: Instituto, vitrine em carrossel dos 3 produtos, Combo Gestão Segura, sobre, equipe, chamada de cursos, dúvidas, contato.
  - `manual-do-empregador.html`, `cartilha-do-bom-fornecedor.html`, `simulador-tributario.html`: uma página por produto (Manual e Simulador oferecem o combo no fim; a Cartilha não).
  - `cursos.html`: cursos em preparação, lista de espera (grava em `contatos` com `origem = 'cursos'`).
  - `termos.html`, `privacidade.html`: **minutas**, revisar antes de publicar.
- `assets/estilo.css`: estilo único (cores da logo em `:root`). Fonte Saira hospedada em `assets/fontes/`.
- `assets/app.js`: preços, janela de compra Pix, carrossel, menu do celular, formulários. Bloco `CONFIG` no topo: WhatsApp, e-mail, dados da empresa (razão social, CNPJ, endereço; exigidos pelo Decreto 7.962/2013) e `dominiosReais`. Fora desses domínios a compra entra em modo pré-visualização (Pix simulado).
- `assets/img/`: logo (transparente, a partir da imagem enviada), marca, favicon, capas (Manual renderizada do PDF final; Cartilha criada no mesmo padrão), fotos dos autores (Felipe e Lais recortadas de prints, resolução baixa).
- `simulador/index.html`: o simulador em modo `profissional` (exige chave). Aceita `?chave=` na URL.
- `api/` (funções Vercel, Node 18+, ESM, sem dependências):
  - `criar-pix.js`: cria a cobrança; `external_reference = ifl:<oferta>`.
  - `status-pix.js` e `webhook.js`: usam `_pedidos.js`, que grava o pedido, gera um link assinado (24 h) para cada PDF e emite a licença uma única vez.
  - `_licenca.js`: chave `RC1.<dados>.<assinatura>` (ECDSA P-256) compatível com o simulador.
  - `_supabase.js`: REST com a service_role. Sem variáveis, não grava nada e o site segue vendendo.
  - `contato.js`: formulários; `origem` = `site` ou `cursos`; campo invisível `site` contra robôs.
- `supabase/schema.sql`: tabelas `pedidos` e `contatos` (RLS ligado, sem políticas públicas), bucket privado `produtos`, visão `vendas_aprovadas`. Idempotente.
- `vercel.json`: endereços sem `.html` e redirecionamentos `/ebook`, `/manual`, `/cartilha`.
- `referencias/`: arquivos originais. Não são publicados (`.vercelignore`).

**Os PDFs dos produtos nunca entram no repositório** (ele é público). Ficam só no bucket `produtos` do Supabase.

## Variáveis de ambiente (Vercel)

- `MP_ACCESS_TOKEN`: Access Token de produção do Mercado Pago. A conta precisa de chave Pix.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- `URL_SITE`: ex. https://institutofelipelopes.com.br (webhook e link do simulador).
- `LIC_CHAVE_PRIVADA`: chave privada JWK do gerador de licenças (par da chave pública embutida no simulador).
- `LIC_DOMINIO`: institutofelipelopes.com.br (a licença só funciona nesse domínio).
- `PDF_BUCKET` (opcional, padrão `produtos`).

Nunca colocar token ou chave privada no HTML nem no repositório.

## Entrega ao cliente

Sem login e senha. A tela de confirmação mostra um botão de download por PDF e, se houver simulador, a chave de licença. Tudo fica gravado na tabela `pedidos`; para reenviar, buscar pelo e-mail.

## Pendências

- Definir preços finais e prazo da licença.
- Preencher `CONFIG.empresa` e `CONFIG.email` em `assets/app.js` e revisar termos e privacidade.
- Confirmar o WhatsApp do Instituto (hoje é o do site antigo do Manual).
- Confirmar que a chave pública do simulador é o par de `LIC_CHAVE_PRIVADA`.
- Envio automático dos links e da chave por e-mail após o pagamento.
- Página `/evento` do site antigo não foi migrada.
- A biografia de Felipe no PDF do Manual diz "mais de 15 anos"; no site está "mais de 20 anos". Confirmar.
- Revisar textos à luz do Provimento 205/2021 da OAB.

## Estilo dos textos

Português do Brasil. Não usar travessão ou hífen ligando orações; usar vírgulas.
