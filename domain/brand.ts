// Active-brand selector. The spine imports `brand` from HERE, never from a specific pack — so a SKU
// swaps its whole identity (emails + checkout copy) in one line. Pairs with domain/index.ts → activeDomain
// for the full pack. To re-skin: point this at another pack's brand.
export { fmcsaBrand as brand } from "./fmcsa/brand";
