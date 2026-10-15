# Instituto Felipe Lopes: portal de infoprodutos e cursos

Portal de vendas do **Instituto Felipe Lopes** (institutofelipelopes.com.br), com uma página por produto (Manual e Simulador oferecem o combo no fim; a Cartilha não). Hospedagem na **Cloudflare (Workers, plano gratuito)**, dados no **Supabase**, pagamento pelo Mercado Pago em duas formas, escolhidas na janela de compra (decidido em 13/10/2026): **Pix com o QR Code no próprio site** (Checkout Transparente, modo `pix-no-site`) e **cartão de crédito em até 12x na página segura do Mercado Pago** (Checkout Pro, o cliente vai e volta para `/obrigado`; os dados do cartão nunca passam pelo site). O modo `checkout` (tudo na página do Mercado Pago) segue disponível e desligado. O repositório se chama `manual-do-empregador` por histórico: o projeto começou como a página de vendas desse e-book.

## Produtos

| Oferta (id) | O que entrega | Preço de lançamento (13/10/2026) |
|---|---|---|
| `manual` | PDF Manual do Empregador (Felipe Lopes e Lais Leite, 42 p., layout na identidade do Instituto desde 13/10/2026) | R$ 47 (de 97) |
| `cartilha` | PDF Cartilha do Bom Fornecedor (Felipe Lopes, Paulo Uchoa e Virgilio Calmon, 24 p.) | R$ 37 (de 67) |
| `simulador` | Licença do Simulador Regime Certo (Virgilio Calmon, co-autor) | R$ 97 (de 147) |
| `combo-gestao` | Manual + Simulador (Combo Gestão Segura) | R$ 117 (de 144, soma dos avulsos) |

**Decisão (ramo `desconto-15`, em prévia em 15/10/2026):** sem combo; cada produto é vendido separado e, na janela de compra, a "Oferta do caixa" deixa o cliente incluir outro produto com 15% de desconto no pedido inteiro (`DESCONTO_KIT` e ofertas `kit-...` geradas em `assets/catalogo.js`). **Decisão anterior, ainda no `main`:** os produtos são vendidos separados e o único combo é Manual + Simulador. Os preços são de lançamento: abaixo de cada preço (cartões, carrossel, caixas das páginas, combo e janela de compra) aparece "Condição de lançamento" (`.lancamento`), e a nota da seção de preços diz que os valores podem mudar para novas compras. A Cartilha é vendida só avulsa, sem combo nem oferta de upgrade.

**Fonte única de preços e entregas: `assets/catalogo.js`.** É importado pelas páginas (`assets/app.js`) e pelo servidor (`servidor/rotas/criar-pagamento.js`, `servidor/rotas/criar-pix.js`, `servidor/pedidos.js`, `servidor/licenca.js`). Para mudar preço, prazo da licença (`LICENCA_MESES`) ou criar produto/combo, altere só esse arquivo. Cada oferta pode ter `upgrade`, que aparece como sugestão na janela de compra.

Para um novo PDF: adicionar em `PRODUTOS` (tipo `pdf`, campo `arquivo`), criar a oferta em `OFERTAS`, enviar o PDF ao bucket `produtos` do Supabase com o mesmo nome e criar a página do produto.

## Estrutura

- Páginas (HTML estático, sem build; topo e rodapé repetidos em cada arquivo, ao mudar o menu altere todos):
  - `index.html`: Instituto, vitrine em carrossel dos 3 produtos, Combo Gestão Segura, sobre, equipe, chamada de cursos, dúvidas, contato.
  - `manual-do-empregador.html`, `cartilha-do-bom-fornecedor.html`, `simulador-tributario.html`: uma página por produto (Manual e Simulador oferecem o combo no fim; a Cartilha não).
  - `obrigado.html`: retorno do Mercado Pago (noindex). Lê `payment_id`/`collection_id` da URL, consulta `api/status-pix` com o e-mail guardado na sessão (ou pede o e-mail) e mostra downloads e licença.
  - `cursos.html`: cursos em preparação, lista de espera (grava em `contatos` com `origem = 'cursos'`).
  - `termos.html`, `privacidade.html`: **minutas**, revisar antes de publicar.
- `assets/estilo.css`: estilo único em **preto e vinho #3C181A, o mesmo das capas** (decidido em 11/10/2026, sem rosa desde 13/10/2026): fundo da página preto com grade sutil (seções sem classe, hero, contato), seções lisas (`.nevoa`, `.escuro`) e rodapé no vinho, cartões em preto avinhado. Botões no vinho com contorno dourado (`--vinho`). Todas as letras em branco (13/10/2026). Destaques dos títulos (`<span class="v">`) só em branco, sem faixa atrás (desde 13/10/2026). Links e pequenos rótulos em dourado (`--vinho-texto`). Botões de falar com a equipe (`.js-whats`, `.flutuante`) no verde do WhatsApp `--zap` #25D366 com branco. Títulos em Anton caixa alta, textos em Saira; as duas fontes ficam em `assets/fontes/`. Imagens com `?v=` (`VERSAO_IMG` no gerador): ao trocar uma imagem, mudar a versão.
- `assets/app.js`: preços, janela de compra Pix, carrossel, menu do celular, formulários. Bloco `CONFIG` no topo: WhatsApp, e-mail, dados da empresa (razão social, CNPJ, endereço; exigidos pelo Decreto 7.962/2013) `dominiosReais` e `pagamento` (`"pix-no-site"` = QR Code na janela, pede CPF, atual; `"checkout"` = redireciona ao Mercado Pago) e `cartao` (`true` = no modo `pix-no-site`, a janela oferece também cartão de crédito, que leva à página do Mercado Pago via `api/criar-pagamento` com `forma: "cartao"`). Ao trocar, mudar também `PAGAMENTO` no gerador das páginas (textos de FAQ, termos, privacidade e passos do simulador dependem do modo). Fora desses domínios a compra entra em modo pré-visualização (pagamento simulado).
- `assets/img/`: logo do Instituto (adotada em 11/10/2026): `logo-ifl-original.png` (cores originais, para fundo claro), `logo-ifl.png` (versão para fundo escuro desde 13/10/2026: símbolo em prata 3D, recortado da arte enviada pelo Sérgio, e nome em branco, sem rosa), `logo-ifl-simbolo.png` (só o símbolo prateado, no topo, no simulador e nas capas dos PDFs), `og-imagem.jpg` (compartilhamento), favicon e apple-touch-icon com o símbolo sobre o vinho; capas (renderizadas da página 1 dos PDFs; desde 13/10/2026 as duas capas seguem o mesmo padrão (vinho #3C181A, título em Bebas Neue, filete e subtítulo dourados #B0781A, autores em branco acima da marca do Instituto com o símbolo prateado, Edição 2026/27; o miolo do Manual também não tem rosa: letras brancas e detalhes dourados); ao trocar um PDF, regenerar a capa do site a partir dele), fotos dos autores (Felipe e Lais recortadas de prints, resolução baixa; `paulo.jpg` e `virgilio.jpg` de ensaio, recortadas em 4:5). Equipe na página inicial em 4 colunas (Felipe, Lais, Paulo Uchoa, Virgilio), textos dos autores sempre justificados; na página da Cartilha, "Quem elaborou" mostra Felipe, Paulo e Virgilio.
- `simulador/index.html`: o simulador em modo `profissional` (exige chave). Aceita `?chave=` na URL.
- `servidor/` (código do servidor na Cloudflare, ESM, sem dependências; nada dessa pasta é publicado como arquivo):
  - `worker.js`: entrada. Só `/api/*` passa por ele (`run_worker_first`); o resto é arquivo estático servido pela Cloudflare. Roteia `/api/criar-pagamento`, `/api/criar-pix`, `/api/status-pix`, `/api/webhook`, `/api/contato` e `/api/saude` para `rotas/`.
  - `ambiente.js`: `ENV` (variáveis do painel, copiadas a cada chamada), `json()`, `lerCorpo()`, `enderecoSite()`. Nunca usar `process.env`, `Buffer` ou `node:*` (o Workers não é Node); usar `crypto` global, `btoa`, `TextEncoder`.
  - `rotas/criar-pagamento.js`: Checkout Pro. Hoje usado só pelo cartão (corpo com `forma = "cartao"`: só cartão de crédito, `PARCELAS_MAX` 12; juros conforme a configuração da conta no Mercado Pago). Cria a preferência e devolve `init_point`; `back_urls` para `/obrigado`, `notification_url` para `/api/webhook`, `metadata {oferta, nome, email}`. Constante `FORMAS`: `"pix"` (só Pix) ou `"todas"` (cartão em até 12x e boleto também).
  - `rotas/criar-pix.js`: QR Code no site (modo `pix-no-site`, atual). Usa a API Payments (`/v1/payments`), que o Mercado Pago mantém, mas recomenda a Orders API para integrações novas. Ambos usam `external_reference = ifl:<oferta>`.
  - `rotas/status-pix.js` e `rotas/webhook.js`: usam `pedidos.js`, que grava o pedido, gera um link assinado (24 h) para cada PDF e emite a licença uma única vez. `status-pix` só devolve downloads e licença se o `email` enviado for o da compra (senão responde `confirme_email`), para que o número do pagamento sozinho não libere a entrega.
  - `licenca.js`: chave `RC1.<dados>.<assinatura>` (ECDSA P-256) compatível com o simulador.
  - `supabase.js`: REST com a service_role (chave legacy `eyJ...` vai no `apikey` e no `Authorization`; chave nova `sb_secret_...` só no `apikey`; valores com espaço são aparados). Sem variáveis, não grava nada e o site segue vendendo.
  - `email.js`: e-mail de entrega pelo Resend (API REST). Mandado uma única vez por pagamento (trava `email_enviado_em` em `pedidos` e chave de idempotência `entrega-<id>`), com links dos PDFs válidos por 7 dias e a chave de licença.
  - `rotas/saude.js`: diagnóstico em `/api/saude` (GET). Diz se cada variável existe e se Supabase (tabelas e PDFs no bucket), chave de licença, Mercado Pago e Resend respondem; nunca devolve valores de chaves. Primeiro lugar a olhar quando algo não grava ou não entrega.
  - `rotas/contato.js`: formulários; `origem` = `site` ou `cursos`; campo invisível `site` contra robôs.
- `supabase/schema.sql`: tabelas `pedidos` e `contatos` (RLS ligado, sem políticas públicas), bucket privado `produtos`, visão `vendas_aprovadas`. Idempotente.
- `wrangler.jsonc`: configuração da Cloudflare. `name` precisa ser igual ao nome do projeto no painel (`instituto-felipe-lopes`). `assets.directory = "."` com `html_handling: auto-trailing-slash` (endereços sem `.html`, `/obrigado.html` redireciona para `/obrigado`); `keep_vars: true`.
- `.assetsignore`: o que NÃO vai para o ar (servidor, supabase, referencias, node_modules, CLAUDE.md, configs). Ao criar pasta interna nova, incluir aqui.
- `_redirects` (`/ebook`, `/manual`, `/cartilha`) e `_headers` (cache de imagens e fontes).
- `package.json`: só o `wrangler` (para `npm run dev` e para a publicação automática).
- `referencias/`: arquivos originais. Não são publicados (`.assetsignore`).

**Os PDFs dos produtos nunca entram no repositório** (ele é público). Ficam só no bucket `produtos` do Supabase.

## Publicação e variáveis de ambiente (Cloudflare)

O GitHub está ligado ao projeto na Cloudflare (Workers Builds): cada push no `main` publica sozinho com `npx wrangler deploy`. Endereço provisório: `instituto-felipe-lopes.<conta>.workers.dev`. O domínio usa os DNS da Cloudflare (servidores trocados no Registro.br); os registros do Resend ficam no DNS da Cloudflare.

Teste local: `npx wrangler dev` (as variáveis de teste vão em `.dev.vars`, que não entra no git). Fora de `CONFIG.dominiosReais` (`institutofelipelopes.com.br`, `workers.dev`) a compra é simulada.

Variáveis em Workers & Pages > projeto > Settings > Variables and Secrets, todas do tipo **Secret**:

- `MP_ACCESS_TOKEN`: Access Token de produção do Mercado Pago. A conta precisa de chave Pix.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- `URL_SITE`: ex. https://institutofelipelopes.com.br (retorno do Mercado Pago, webhook e link do simulador).
- `LIC_CHAVE_PRIVADA`: chave privada JWK do gerador de licenças (par da chave pública embutida no simulador).
- `LIC_DOMINIO`: institutofelipelopes.com.br (a licença só funciona nesse domínio).
- `PDF_BUCKET` (opcional, padrão `produtos`).
- `RESEND_API_KEY` e `EMAIL_REMETENTE` (ex.: `Instituto Felipe Lopes <contato@institutofelipelopes.com.br>`): ativam o e-mail de entrega. `EMAIL_RESPOSTA` opcional. Sem elas, a venda funciona e só não manda e-mail.

Nunca colocar token ou chave privada no HTML nem no repositório.

## Entrega ao cliente

Sem login e senha. A tela de confirmação mostra um botão de download por PDF (link de 24 h) e, se houver simulador, a chave de licença. O mesmo conteúdo vai por e-mail ao comprador (links de 7 dias), inclusive se ele fechar a página antes da confirmação. Tudo fica gravado na tabela `pedidos`; para reenviar, buscar pelo e-mail.

## Pendências

- Pagamento ligado e testado em 13/10/2026 (Pix no site e cartão no Mercado Pago, downloads, chave do simulador e e-mail sem erros). Se precisar testar de novo, uma oferta temporária de R$ 1 no catálogo basta; lembrar de remover.


- Preços de lançamento definidos em 13/10/2026; ao encerrar o lançamento, ajustar o catálogo e retirar "Condição de lançamento" (gerador e `assets/app.js`).
- CNPJ fora do site por decisão do Sérgio (por enquanto). Preencher `CONFIG.empresa` e `CONFIG.email` em `assets/app.js` quando houver; revisar termos e privacidade.
- WhatsApp: `WHATSAPP` em `assets/catalogo.js` (confirmado o número 558198590139), usado no site e no e-mail.
- Par de chaves de licença gerado em 09/10/2026: a pública está em `simulador/index.html` (`CONFIG.chavePublica`); a privada foi entregue ao Sérgio e vai só na variável `LIC_CHAVE_PRIVADA`. Se a privada vazar, gerar um par novo (as licenças antigas deixam de valer).
- Configurar o Resend (verificar o domínio com os registros DNS na Cloudflare) para ativar o e-mail de entrega.
- Página `/evento` do site antigo não foi migrada.
- A biografia de Felipe no PDF do Manual diz "mais de 15 anos"; no site está "mais de 20 anos". Confirmar.
- Revisar textos à luz do Provimento 205/2021 da OAB.

## Estilo dos textos

Português do Brasil. Não usar travessão ou hífen ligando orações; usar vírgulas.
