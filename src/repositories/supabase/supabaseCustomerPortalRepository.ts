import type { Locale } from "@/config/site";
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
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";

type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function mapAccount(row: Record<string, unknown>): CustomerAccountRecord {
  return {
    userId: row.user_id as string,
    organizationId: row.organization_id as string,
    customerId: row.customer_id as string,
    preferredLocale: (row.preferred_locale as Locale) ?? "zh-tw",
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function mapCustomer(row: Record<string, unknown>): CustomerProfileRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    email: (row.email as string | null) ?? undefined,
    contactHandle: (row.contact_handle as string | null) ?? undefined,
    countryCode: (row.country_code as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    consentedAt: (row.consented_at as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

function mapAddress(row: Record<string, unknown>): CustomerAddressRecord {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    recipientName: (row.recipient_name as string | null) ?? undefined,
    countryCode: (row.country_code as string | null) ?? undefined,
    postalCode: (row.postal_code as string | null) ?? undefined,
    line1: (row.line1 as string | null) ?? undefined,
    line2: (row.line2 as string | null) ?? undefined,
    city: (row.city as string | null) ?? undefined,
    region: (row.region as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
  };
}

async function getSnapshot(account: CustomerAccountRecord): Promise<CustomerPortalSnapshot> {
  const repo = supabaseCustomerPortalRepository;
  const profile = await repo.getCustomer(account.customerId);
  if (!profile) throw new CommerceError("not_found", `customer ${account.customerId} not found`);
  return { account, profile, addresses: await repo.listAddresses(account.customerId) };
}

export const supabaseCustomerPortalRepository: CustomerPortalRepository = {
  async getAccountByUserId(userId) {
    const client = db();
    const { data, error } = await client
      .from("customer_accounts")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapAccount(data as Record<string, unknown>) : null;
  },
  async getCustomer(customerId) {
    const client = db();
    const { data, error } = await client
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapCustomer(data as Record<string, unknown>) : null;
  },
  async updateCustomerProfile(account, patch: CustomerProfileUpdateInput) {
    if (patch.name !== undefined && patch.name.trim() === "") {
      throw new CommerceError("validation", "name is required");
    }
    const client = db();
    const customerUpdate: Record<string, unknown> = {};
    if (patch.name !== undefined) customerUpdate.name = patch.name;
    if (patch.email !== undefined) customerUpdate.email = patch.email || null;
    if (patch.contactHandle !== undefined) customerUpdate.contact_handle = patch.contactHandle || null;
    if (patch.countryCode !== undefined) customerUpdate.country_code = patch.countryCode || null;
    if (patch.phone !== undefined) customerUpdate.phone = patch.phone || null;
    if (Object.keys(customerUpdate).length > 0) {
      const { error } = await client.from("customers").update(customerUpdate).eq("id", account.customerId);
      if (error) throwCommerce(error);
    }
    if (patch.preferredLocale !== undefined) {
      const { error } = await client
        .from("customer_accounts")
        .update({ preferred_locale: patch.preferredLocale })
        .eq("user_id", account.userId);
      if (error) throwCommerce(error);
    }
    const updatedAccount = (await this.getAccountByUserId(account.userId)) ?? account;
    return getSnapshot(updatedAccount);
  },
  async listAddresses(customerId) {
    const client = db();
    const { data, error } = await client
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true });
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapAddress(r as Record<string, unknown>));
  },
  async createAddress(account, input: CustomerAddressInput) {
    const client = db();
    const { data, error } = await client
      .from("customer_addresses")
      .insert({
        customer_id: account.customerId,
        recipient_name: input.recipientName,
        country_code: input.countryCode,
        postal_code: input.postalCode,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        region: input.region,
        phone: input.phone,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    return mapAddress(data as Record<string, unknown>);
  },
  async updateAddress(account, addressId, patch) {
    const client = db();
    const { data, error } = await client
      .from("customer_addresses")
      .update({
        recipient_name: patch.recipientName,
        country_code: patch.countryCode,
        postal_code: patch.postalCode,
        line1: patch.line1,
        line2: patch.line2,
        city: patch.city,
        region: patch.region,
        phone: patch.phone,
      })
      .eq("id", addressId)
      .eq("customer_id", account.customerId)
      .select("*")
      .maybeSingle();
    if (error) throwCommerce(error);
    if (!data) throw new CommerceError("not_found", `customer address ${addressId} not found`);
    return mapAddress(data as Record<string, unknown>);
  },
  async getSnapshot(account) {
    return getSnapshot(account);
  },
};
