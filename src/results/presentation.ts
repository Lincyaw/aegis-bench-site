/** A share as a percentage with one decimal, such as 45.1%. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** An amount in US dollars to the cent. */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
