import type { Locale } from "@/config/site";

export type CustomerAccountRecord = {
  userId: string;
  organizationId: string;
  customerId: string;
  preferredLocale: Locale;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CustomerProfileRecord = {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  contactHandle?: string;
  countryCode?: string;
  phone?: string;
  consentedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CustomerAddressRecord = {
  id: string;
  customerId: string;
  recipientName?: string;
  countryCode?: string;
  postalCode?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  phone?: string;
  createdAt: string;
};

export type CustomerProfileUpdateInput = Partial<{
  name: string;
  email: string;
  contactHandle: string;
  countryCode: string;
  phone: string;
  preferredLocale: Locale;
}>;

export type CustomerAddressInput = Partial<{
  recipientName: string;
  countryCode: string;
  postalCode: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  phone: string;
}>;

export type CustomerPortalSnapshot = {
  account: CustomerAccountRecord;
  profile: CustomerProfileRecord;
  addresses: CustomerAddressRecord[];
};
