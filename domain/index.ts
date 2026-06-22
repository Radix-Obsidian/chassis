// Active domain pack. The spine reads the live SKU's rules/artifacts/cadence through `activeDomain`,
// and the contract types through this module. Selecting a different SKU = change this one re-export
// (and domain/brand.ts). The contract stays fixed; only the pack behind it changes.
export * from "./contract";
export { fmcsaPack as activeDomain } from "./fmcsa/pack";
