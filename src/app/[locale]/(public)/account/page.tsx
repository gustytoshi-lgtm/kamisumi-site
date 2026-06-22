import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountActionForm, type AccountFormField } from "@/components/account/AccountActionForm";
import { Notice } from "@/components/ui/Notice";
import { PageIntro } from "@/components/ui/PageIntro";
import { isCustomerPortalEnabled } from "@/config/features";
import { localeNames, supportedLocales } from "@/config/site";
import { getDictionary } from "@/dictionaries";
import { getCustomerAuthMode, getCustomerSession } from "@/lib/customer/auth";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { getCustomerPortalService } from "@/repositories";
import type { CustomerAddressRecord } from "@/repositories/core/customerModels";
import { SignInForm } from "@/components/auth/SignInForm";
import { createAddressAction, updateAddressAction, updateProfileAction } from "./actions";
import { customerSignInAction, customerSignOutAction } from "./authActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  // 顧客の個人領域。flag で有効化しても検索エンジンには載せない。
  return {
    ...buildMetadata({
      locale,
      path: "/account",
      title: dictionary.account.title,
      description: dictionary.account.description,
    }),
    robots: { index: false, follow: false },
  };
}

function addressFields(
  fields: ReturnType<typeof getDictionary>["account"]["fields"],
  locale: string,
  address?: CustomerAddressRecord,
): AccountFormField[] {
  const base: AccountFormField[] = [{ kind: "hidden", name: "locale", value: locale }];
  if (address) base.push({ kind: "hidden", name: "addressId", value: address.id });
  return [
    ...base,
    { kind: "text", name: "recipientName", label: fields.recipientName, defaultValue: address?.recipientName },
    { kind: "text", name: "countryCode", label: fields.country, defaultValue: address?.countryCode, placeholder: "TW / JP" },
    { kind: "text", name: "postalCode", label: fields.postalCode, defaultValue: address?.postalCode },
    { kind: "text", name: "line1", label: fields.line1, defaultValue: address?.line1 },
    { kind: "text", name: "line2", label: fields.line2, defaultValue: address?.line2 },
    { kind: "text", name: "city", label: fields.city, defaultValue: address?.city },
    { kind: "text", name: "region", label: fields.region, defaultValue: address?.region },
    { kind: "tel", name: "phone", label: fields.phone, defaultValue: address?.phone },
  ];
}

export default async function AccountPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const a = dictionary.account;

  // flag 無効時は真の 404（proxy でも遮断。defense in depth）。
  if (!isCustomerPortalEnabled()) notFound();

  const session = await getCustomerSession();

  if (!session) {
    const supabaseAuth = getCustomerAuthMode() === "supabase";
    return (
      <>
        <PageIntro description={a.description} title={a.title} />
        <section className="page-section compact">
          <div className="content-shell">
            <Notice>{a.loginRequiredHint}</Notice>
            <h2>{a.loginRequired}</h2>
            {supabaseAuth ? (
              <>
                <p className="muted">{a.auth.intro}</p>
                <SignInForm
                  action={customerSignInAction}
                  labels={{
                    email: a.fields.email,
                    password: a.auth.password,
                    signIn: a.auth.signIn,
                    invalidCredentials: a.auth.invalidCredentials,
                    missingFields: a.auth.missingFields,
                  }}
                  locale={locale}
                />
              </>
            ) : null}
            <p>
              <a href={`/${locale}`}>{dictionary.common.backToHome}</a>
            </p>
          </div>
        </section>
      </>
    );
  }

  const snapshot = await getCustomerPortalService().getSnapshot(session);
  const { profile, addresses } = snapshot;

  const localeOptions = supportedLocales.map((l) => ({ value: l, label: localeNames[l] }));

  const profileFields: AccountFormField[] = [
    { kind: "hidden", name: "locale", value: locale },
    { kind: "text", name: "name", label: a.fields.name, required: true, defaultValue: profile.name },
    { kind: "email", name: "email", label: a.fields.email, defaultValue: profile.email },
    { kind: "text", name: "contactHandle", label: a.fields.contactHandle, defaultValue: profile.contactHandle },
    { kind: "text", name: "countryCode", label: a.fields.country, defaultValue: profile.countryCode, placeholder: "TW / JP" },
    { kind: "tel", name: "phone", label: a.fields.phone, defaultValue: profile.phone },
    { kind: "select", name: "preferredLocale", label: a.fields.preferredLocale, defaultValue: session.preferredLocale, options: localeOptions },
  ];

  return (
    <>
      <PageIntro description={a.description} kicker={a.signedInAs} title={a.title} />
      <section className="page-section compact">
        <div className="content-shell" style={{ display: "grid", gap: "28px" }}>
          <Notice>{a.demoNote}</Notice>

          <div>
            <h2>{a.profileHeading}</h2>
            <p className="muted">
              {a.signedInAs}: {profile.name}
            </p>
            {getCustomerAuthMode() === "supabase" ? (
              <form action={customerSignOutAction} style={{ margin: "0 0 12px" }}>
                <input name="locale" type="hidden" value={locale} />
                <button type="submit">{a.auth.signOut}</button>
              </form>
            ) : null}
            <AccountActionForm
              action={updateProfileAction}
              fields={profileFields}
              notify={a.notify}
              submitLabel={a.saveProfile}
            />
          </div>

          <div>
            <h2>{a.addressesHeading}</h2>
            {addresses.length === 0 ? <p className="muted">{a.noAddresses}</p> : null}
            <div style={{ display: "grid", gap: "24px" }}>
              {addresses.map((address) => (
                <div key={address.id}>
                  <h3 style={{ fontSize: "0.95rem" }}>{a.editAddressHeading}</h3>
                  <AccountActionForm
                    action={updateAddressAction}
                    fields={addressFields(a.fields, locale, address)}
                    notify={a.notify}
                    submitLabel={a.saveAddress}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2>{a.addAddressHeading}</h2>
            <AccountActionForm
              action={createAddressAction}
              fields={addressFields(a.fields, locale)}
              notify={a.notify}
              submitLabel={a.addAddress}
            />
          </div>
        </div>
      </section>
    </>
  );
}
