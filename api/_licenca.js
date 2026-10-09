// api/_licenca.js
// Gera a chave de licença do Simulador Regime Certo no mesmo formato do gerador
// (RC1.<dados>.<assinatura>), assinada com a chave privada guardada na Vercel.
// Arquivos que começam com "_" não viram endereço público na Vercel.

import { webcrypto } from "node:crypto";
const { subtle } = webcrypto;

const b64u = buf =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

import { LICENCA_MESES } from "../assets/catalogo.js"; // prazo definido no catálogo
export { LICENCA_MESES };

export async function gerarLicenca({ nome, idPagamento, dataAprovacao }) {
  const jwk = process.env.LIC_CHAVE_PRIVADA;
  if (!jwk) throw new Error("LIC_CHAVE_PRIVADA não configurada");

  const chave = await subtle.importKey(
    "jwk", JSON.parse(jwk), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );

  const base = dataAprovacao ? new Date(dataAprovacao) : new Date();
  const venc = new Date(base);
  venc.setMonth(venc.getMonth() + LICENCA_MESES);

  const aammdd = base.toISOString().slice(2, 10).replace(/-/g, "");
  const dados = {
    i: `RC-${aammdd}-${Number(idPagamento).toString(36).toUpperCase().slice(-4)}`, // nº da licença
    n: String(nome || "Cliente").trim(),                                          // titular
    e: venc.toISOString().slice(0, 10),                                           // vencimento
  };
  if (process.env.LIC_DOMINIO) dados.h = process.env.LIC_DOMINIO;                 // domínio permitido

  const corpo = "RC1." + b64u(Buffer.from(JSON.stringify(dados), "utf8"));
  const assinatura = await subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, chave, new TextEncoder().encode(corpo)
  );
  return { chave: corpo + "." + b64u(new Uint8Array(assinatura)), numero: dados.i, vencimento: dados.e, titular: dados.n };
}
