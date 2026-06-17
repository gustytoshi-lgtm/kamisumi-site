import { mockCommerceRepository } from "./kamisumi/mockCommerceRepository";

export function getCommerceRepository() {
  // Phase 2 can switch this factory to Supabase, Shopify, or a CMS-backed implementation.
  return mockCommerceRepository;
}
