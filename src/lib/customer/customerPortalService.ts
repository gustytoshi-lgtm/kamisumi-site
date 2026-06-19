import type {
  CustomerAddressInput,
  CustomerPortalSnapshot,
  CustomerProfileUpdateInput,
} from "@/repositories/core/customerModels";
import type { CustomerPortalRepository } from "@/repositories/core/customerRepository";
import { CommerceError } from "@/repositories/core/writeModels";
import type { CustomerSession } from "./auth";
import { validateAddressInput, validateProfilePatch } from "./validation";

function requireSession(session: CustomerSession | null): CustomerSession {
  if (!session) throw new CommerceError("forbidden", "customer login required");
  return session;
}

export function createCustomerPortalService(repository: CustomerPortalRepository) {
  return {
    async getSnapshot(session: CustomerSession | null): Promise<CustomerPortalSnapshot> {
      const s = requireSession(session);
      const account = await repository.getAccountByUserId(s.userId);
      if (!account || account.customerId !== s.customerId) {
        throw new CommerceError("forbidden", "customer account mismatch");
      }
      return repository.getSnapshot(account);
    },
    async updateProfile(session: CustomerSession | null, patch: CustomerProfileUpdateInput) {
      const s = requireSession(session);
      const account = await repository.getAccountByUserId(s.userId);
      if (!account || account.customerId !== s.customerId) {
        throw new CommerceError("forbidden", "customer account mismatch");
      }
      validateProfilePatch(patch);
      return repository.updateCustomerProfile(account, patch);
    },
    async createAddress(session: CustomerSession | null, input: CustomerAddressInput) {
      const s = requireSession(session);
      const account = await repository.getAccountByUserId(s.userId);
      if (!account || account.customerId !== s.customerId) {
        throw new CommerceError("forbidden", "customer account mismatch");
      }
      validateAddressInput(input);
      return repository.createAddress(account, input);
    },
    async updateAddress(session: CustomerSession | null, addressId: string, patch: CustomerAddressInput) {
      const s = requireSession(session);
      const account = await repository.getAccountByUserId(s.userId);
      if (!account || account.customerId !== s.customerId) {
        throw new CommerceError("forbidden", "customer account mismatch");
      }
      validateAddressInput(patch);
      return repository.updateAddress(account, addressId, patch);
    },
  };
}

export type CustomerPortalService = ReturnType<typeof createCustomerPortalService>;
