import { CommerceError } from "@/repositories/core/writeModels";
import type {
  CustomerAddressInput,
  CustomerProfileUpdateInput,
} from "@/repositories/core/customerModels";

/**
 * 顧客マイページ入力の純粋バリデーション（堅牢化）。
 *
 * service 層から呼ぶことで mock / Supabase 双方に同じ検証を適用する。
 * 不正値は `CommerceError("validation")` を投げ、UI は notify で i18n 表示する。
 * 値の正規化（保存内容の書き換え）は行わない＝挙動を予測可能に保つ。
 */
export const CUSTOMER_FIELD_LIMITS = {
  name: 120,
  email: 254,
  contactHandle: 120,
  phone: 40,
  recipientName: 120,
  postalCode: 20,
  line1: 200,
  line2: 200,
  city: 120,
  region: 120,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 電話番号は数字と一般的な区切り（+ - 空白 ( ) .）のみ許可。
const PHONE_RE = /^[0-9+\-() .]+$/;
// 国コードは2文字のラテン文字（ISO 3166-1 alpha-2 を想定）。
const COUNTRY_RE = /^[A-Za-z]{2}$/;

function reject(message: string): never {
  throw new CommerceError("validation", message);
}

function checkLength(value: string | undefined, max: number, field: string): void {
  if (value !== undefined && value.length > max) {
    reject(`${field} exceeds ${max} characters`);
  }
}

export function isValidEmail(email: string): boolean {
  return email.length <= CUSTOMER_FIELD_LIMITS.email && EMAIL_RE.test(email);
}

export function isValidCountryCode(code: string): boolean {
  return COUNTRY_RE.test(code);
}

export function isValidPhone(phone: string): boolean {
  return phone.length <= CUSTOMER_FIELD_LIMITS.phone && PHONE_RE.test(phone);
}

/** プロフィール更新 patch を検証する。空文字は「変更なし」ではなく与えられた値として扱われる前提で呼ぶ。 */
export function validateProfilePatch(patch: CustomerProfileUpdateInput): void {
  if (patch.name !== undefined) {
    if (patch.name.trim() === "") reject("name is required");
    checkLength(patch.name, CUSTOMER_FIELD_LIMITS.name, "name");
  }
  if (patch.email !== undefined && patch.email !== "" && !isValidEmail(patch.email)) {
    reject("invalid email");
  }
  checkLength(patch.contactHandle, CUSTOMER_FIELD_LIMITS.contactHandle, "contactHandle");
  if (patch.countryCode !== undefined && patch.countryCode !== "" && !isValidCountryCode(patch.countryCode)) {
    reject("invalid country code");
  }
  if (patch.phone !== undefined && patch.phone !== "" && !isValidPhone(patch.phone)) {
    reject("invalid phone");
  }
}

/** 住所入力を検証する。 */
export function validateAddressInput(input: CustomerAddressInput): void {
  checkLength(input.recipientName, CUSTOMER_FIELD_LIMITS.recipientName, "recipientName");
  if (input.countryCode !== undefined && input.countryCode !== "" && !isValidCountryCode(input.countryCode)) {
    reject("invalid country code");
  }
  checkLength(input.postalCode, CUSTOMER_FIELD_LIMITS.postalCode, "postalCode");
  checkLength(input.line1, CUSTOMER_FIELD_LIMITS.line1, "line1");
  checkLength(input.line2, CUSTOMER_FIELD_LIMITS.line2, "line2");
  checkLength(input.city, CUSTOMER_FIELD_LIMITS.city, "city");
  checkLength(input.region, CUSTOMER_FIELD_LIMITS.region, "region");
  if (input.phone !== undefined && input.phone !== "" && !isValidPhone(input.phone)) {
    reject("invalid phone");
  }
}
