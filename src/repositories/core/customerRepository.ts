import type {
  CustomerAccountRecord,
  CustomerAddressInput,
  CustomerAddressRecord,
  CustomerPortalSnapshot,
  CustomerProfileRecord,
  CustomerProfileUpdateInput,
} from "./customerModels";

/**
 * 顧客マイページ用 repository。管理者向け顧客操作とは分離し、本人の customerId を起点に扱う。
 * 内部メモ・全顧客 export・原価/利益はこの契約に含めない。
 */
export interface CustomerPortalRepository {
  getAccountByUserId(userId: string): Promise<CustomerAccountRecord | null>;
  getCustomer(customerId: string): Promise<CustomerProfileRecord | null>;
  updateCustomerProfile(
    account: CustomerAccountRecord,
    patch: CustomerProfileUpdateInput,
  ): Promise<CustomerPortalSnapshot>;
  listAddresses(customerId: string): Promise<CustomerAddressRecord[]>;
  createAddress(account: CustomerAccountRecord, input: CustomerAddressInput): Promise<CustomerAddressRecord>;
  updateAddress(
    account: CustomerAccountRecord,
    addressId: string,
    patch: CustomerAddressInput,
  ): Promise<CustomerAddressRecord>;
  getSnapshot(account: CustomerAccountRecord): Promise<CustomerPortalSnapshot>;
}
