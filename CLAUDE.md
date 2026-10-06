# Manual do Empregador + Simulador Regime Certo

Site de vendas (manualdoempregador.com.br) do e-book **Manual do Empregador** (Felipe Lopes e Lais Leite) integrado ao **Simulador Tributário Regime Certo** (Virgilio Calmon, co-autor). Hospedagem na **Vercel**, pagamento **Pix via Mercado Pago (Checkout Transparente)**, com o QR Code exibido no próprio site.

## Estrutura

- `index.html`: página de vendas (HTML, CSS e JS num arquivo só, sem build).
  - Carrossel no topo com dois slides: Manual e Simulador.
  - Seções: alerta, conteúdo do Manual, simulador (Fator R, públicos empresa e contador/advogado), para quem é, autores (3 colunas), por que, depoimentos, planos, dúvidas, contato, rodapé.
  - Janela de compra Pix com oferta adicional (quem compra um produto pode completar o combo).
  - Bloco `CONFIG` no fim do arquivo: preços, prazo da licença, WhatsApp, depoimentos.
  - Fora dos domínios em `CONFIG.dominiosReais`, entra em modo pré-visualização (Pix simulado).
- `simulador/index.html`: simulador em modo `profissional` (exige chave de licença). Aceita `?chave=` na URL para preencher a chave.
- `imagens/`: capa.jpg, felipe.jpg, lais.jpg, virgilio.jpg (capa e fotos de Felipe/Lais foram recortadas de prints, resolução baixa; substituir pelos originais).
- `api/` (funções serverless da Vercel, Node 18+, ESM):
  - `criar-pix.js`: cria a cobrança Pix. **Preços reais ficam em `PLANOS`.** `external_reference = manual-empregador:<plano>`.
  - `status-pix.js`: consultado pela página a cada 5 s. Quando aprovado, devolve `link_pdf` (planos ebook/kit) e gera a licença (planos simulador/kit).
  - `_licenca.js`: gera chave `RC1.<dados>.<assinatura>` (ECDSA P-256, SHA-256) compatível com a verificação do simulador. Prazo em `LICENCA_MESES`.
  - `webhook.js`: recebe avisos do Mercado Pago e registra nos Logs.
- `referencias/`: arquivos originais (site salvo, simulador público) e a prévia com imagens embutidas. Não são publicados.

## Planos (valores provisórios)

| Plano | id | Preço | Entrega |
|---|---|---|---|
| Manual do Empregador | `ebook` | R$ 47 | PDF |
| Simulador Regime Certo | `simulador` | R$ 97 | Licença 12 meses |
| Combo Gestão Segura | `kit` | R$ 117 | PDF + licença |

Ao mudar preços, alterar **nos dois lugares**: `PLANOS` em `api/criar-pix.js` e `CONFIG.precos` em `index.html`. Prazo da licença: `LICENCA_MESES` em `api/_licenca.js` e `CONFIG.licencaMeses`.

## Variáveis de ambiente (Vercel)

- `MP_ACCESS_TOKEN`: Access Token de produção (APP_USR-...). A conta precisa de chave Pix.
- `LINK_PDF`: link de download do e-book.
- `URL_SITE`: ex. https://manualdoempregador.com.br (ativa o webhook e o link do simulador).
- `LIC_CHAVE_PRIVADA`: chave privada JWK do gerador de licenças (par da chave pública embutida no simulador).
- `LIC_DOMINIO`: manualdoempregador.com.br.

Nunca colocar token ou chave privada no HTML nem no repositório.

## Entrega ao cliente

Sem login e senha: o acesso ao simulador é pela chave de licença mostrada na tela de confirmação. Se o cliente perder a chave, emitir outra no gerador de licenças.

## Pendências

- Definir preços finais e prazo da licença.
- Envio automático do PDF e da chave por e-mail após o pagamento (ex.: Resend no `webhook.js`).
- Confirmar que a chave pública do simulador é o par de `LIC_CHAVE_PRIVADA`.
- O site atual na Vercel é um app React que também tem `/evento`; publicar este projeto como projeto novo e testar antes de apontar o domínio.
- Revisar textos à luz do Provimento 205/2021 da OAB.

## Estilo dos textos

Português do Brasil. Não usar travessão ou hífen ligando orações; usar vírgulas.
