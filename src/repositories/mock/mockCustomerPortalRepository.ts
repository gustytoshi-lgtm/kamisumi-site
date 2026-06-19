import { siteConfig } from "@/config/site";
import type { CustomerPortalRepository } from "@/repositories/core/customerRepository";
import type {
  CustomerAccountRecord,
  CustomerAddressInput,
  CustomerAddressRecord,
  CustomerPortalSnapshot,
  CustomerProfileRecord,
  CustomerProfileUpdateInput,
} from "@/repositories/core/customerModels";
import { CommerceError } from "@/repositories/core/writeModels";

export type MockCustomerPortalRepository = CustomerPortalRepository & { reset(): void; seed(): void };

const ORG = siteConfig.organization.id;
export const MOCK_CUSTOMER_USER_ID = "customer-dev-user";
export const MOCK_CUSTOMER_ID = "customer-dev-1";

function now() {
  return new Date().toISOString();
}

export function createMockCustomerPortalRepository(): MockCustomerPortalRepository {
  let accounts = new Map<string, CustomerAccountRecord>();
  let customers = new Map<string, CustomerProfileRecord>();
  let addresses = new Map<string, CustomerAddressRecord>();
  let addressCounter = 0;

  function seed() {
    const timestamp = now();
    accounts = new Map([
      [
        MOCK_CUSTOMER_USER_ID,
        {
          userId: MOCK_CUSTOMER_USER_ID,
          organizationId: ORG,
          customerId: MOCK_CUSTOMER_ID,
          preferredLocale: "zh-tw",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    ]);
    customers = new Map([
      [
        MOCK_CUSTOMER_ID,
        {
          id: MOCK_CUSTOMER_ID,
          organizationId: ORG,
          name: "KAMISUMI Guest",
          email: "guest@example.com",
          countryCode: "TW",
          consentedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    ]);
    addresses = new Map();
    addressCounter = 0;
  }

  function requireCustomer(customerId: string): CustomerProfileRecord {
    const profile = customers.get(customerId);
    if (!profile || profile.deletedAt) throw new CommerceError("not_found", `customer ${customerId} not found`);
    return profile;
  }

  function requireAddress(account: CustomerAccountRecord, addressId: string): CustomerAddressRecord {
    const address = addresses.get(addressId);
    if (!address || address.customerId !== account.customerId) {
      throw new CommerceError("not_found", `customer address ${addressId} not found`);
    }
    return address;
  }

  async function snapshot(account: CustomerAccountRecord): Promise<CustomerPortalSnapshot> {
    return {
      account,
      profile: requireCustomer(account.customerId),
      addresses: [...addresses.values()].filter((a) => a.customerId === account.customerId),
    };
  }

  const repo: MockCustomerPortalRepository = {
    reset() {
      accounts = new Map();
      customers = new Map();
      addresses = new Map();
      addressCounter = 0;
    },
    seed,
    async getAccountByUserId(userId) {
      const account = accounts.get(userId);
      return account && !account.deletedAt ? account : null;
    },
    async getCustomer(customerId) {
      const profile = customers.get(customerId);
      return profile && !profile.deletedAt ? profile : null;
    },
    async updateCustomerProfile(account, patch: CustomerProfileUpdateInput) {
      const profile = requireCustomer(account.customerId);
      if (patch.name !== undefined && patch.name.trim() === "") {
        throw new CommerceError("validation", "name is required");
      }
      const updatedProfile: CustomerProfileRecord = {
        ...profile,
        name: patch.name ?? profile.name,
        email: patch.email ?? profile.email,
        contactHandle: patch.contactHandle ?? profile.contactHandle,
        countryCode: patch.countryCode ?? profile.countryCode,
        phone: patch.phone ?? profile.phone,
        updatedAt: now(),
      };
      const updatedAccount: CustomerAccountRecord = {
        ...account,
        preferredLocale: patch.preferredLocale ?? account.preferredLocale,
        updatedAt: now(),
      };
      customers.set(profile.id, updatedProfile);
      accounts.set(account.userId, updatedAccount);
      return snapshot(updatedAccount);
    },
    async listAddresses(customerId) {
      return [...addresses.values()].filter((a) => a.customerId === customerId);
    },
    async createAddress(account, input: CustomerAddressInput) {
      const address: CustomerAddressRecord = {
        id: `addr-${++addressCounter}`,
        customerId: account.customerId,
        recipientName: input.recipientName,
        countryCode: input.countryCode,
        postalCode: input.postalCode,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        region: input.region,
        phone: input.phone,
        createdAt: now(),
      };
      addresses.set(address.id, address);
      return address;
    },
    async updateAddress(account, addressId, patch) {
      const address = requireAddress(account, addressId);
      const updated = { ...address, ...patch };
      addresses.set(addressId, updated);
      return updated;
    },
    async getSnapshot(account) {
      return snapshot(account);
    },
  };

  seed();
  return repo;
}

export const mockCustomerPortalRepository = createMockCustomerPortalRepository();
