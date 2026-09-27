/**
 * Dados legais da loja, usados nos Termos, Privacidade, Reembolsos e rodapé.
 * ⚠️ PREENCHER ANTES DO LANÇAMENTO (os campos entre [ ] aparecem assim no site).
 * Recomenda-se que os textos legais sejam revistos por um jurista.
 */
export const LEGAL = {
  storeName: "Plutão Shop",
  /** Nome completo (empresário em nome individual) ou firma da empresa. */
  operator: "[Nome ou firma do titular da loja]",
  nif: "[NIF]",
  address: "[Morada completa]",
  email: "[email de contacto]",
  lastUpdated: "27 de setembro de 2026",
  /** Prazo para reclamar de uma conta que não corresponde ao anúncio. */
  claimWindowHours: 48,
  complaintsBookUrl: "https://www.livroreclamacoes.pt",
  /** Entidade de Resolução Alternativa de Litígios (Portugal). */
  ralUrl: "https://www.consumidor.gov.pt",
} as const;

export const LEGAL_INCOMPLETE = Object.values(LEGAL).some(
  (value) => typeof value === "string" && value.startsWith("["),
);
