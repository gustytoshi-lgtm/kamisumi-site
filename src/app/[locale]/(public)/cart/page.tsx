import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CartActionForm, type CartFormField } from "@/components/cart/CartActionForm";
import { Notice } from "@/components/ui/Notice";
import { PageIntro } from "@/components/ui/PageIntro";
import { isCartEnabled } from "@/config/features";
import {
  convertMoneyDemo,
  isSupportedDisplayCurrency,
  shippingCountries,
  supportedDisplayCurrencies,
  zoneForCountry,
} from "@/config/shipping";
import { getDictionary } from "@/dictionaries";
import { formatMoney } from "@/lib/format";
import { getLocalizedText } from "@/lib/localization";
import { getLocaleFromParams, type LocaleParams } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { cartSubtotal } from "@/lib/commerce/cart";
import { multiplyMoney } from "@/lib/commerce/money";
import { getCartRepository, getCheckoutAdapter, getCommerceRepository } from "@/repositories";
import {
  addToCartAction,
  checkoutAction,
  clearCartAction,
  removeItemAction,
  setDestinationAction,
  setDisplayCurrencyAction,
  updateQuantityAction,
} from "./actions";
import { CART_COOKIE, CHECKOUT_COOKIE, CURRENCY_COOKIE, DEST_COOKIE } from "./cartCookies";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  return {
    ...buildMetadata({
      locale,
      path: "/cart",
      title: dictionary.cart.title,
      description: dictionary.cart.description,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function CartPage({ params }: LocaleParams) {
  const locale = await getLocaleFromParams(params);
  const dictionary = getDictionary(locale);
  const c = dictionary.cart;

  if (!isCartEnabled()) notFound();

  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value ?? null;
  const checkoutId = store.get(CHECKOUT_COOKIE)?.value ?? null;
  const destCountry = store.get(DEST_COOKIE)?.value ?? null;
  const displayCurrency = store.get(CURRENCY_COOKIE)?.value ?? null;

  const cart = cartId ? await getCartRepository().getCart(cartId) : null;
  const checkout = checkoutId ? await getCheckoutAdapter().getCheckout(checkoutId) : null;

  const products = await getCommerceRepository().listProducts();
  const productBySlug = new Map(products.map((p) => [p.slug, p] as const));

  const productOptions = products.map((p) => ({
    value: p.slug,
    label: `${getLocalizedText(p.title, locale)} — ${formatMoney(p.price, locale)}`,
  }));

  const items = cart?.items ?? [];
  const subtotal = cart ? cartSubtotal(cart) : null;

  const s = dictionary.shippingEstimate;
  const selectedZone = destCountry ? zoneForCountry(destCountry) : null;
  const displayCur =
    displayCurrency && isSupportedDisplayCurrency(displayCurrency) ? displayCurrency : null;
  const convertedSubtotal = subtotal && displayCur ? convertMoneyDemo(subtotal, displayCur) : null;

  const addFields: CartFormField[] = [
    { kind: "hidden", name: "locale", value: locale },
    {
      kind: "select",
      name: "slug",
      label: c.productLabel,
      required: true,
      options: productOptions,
    },
    { kind: "number", name: "quantity", label: c.quantityLabel, defaultValue: "1", min: 1, required: true },
  ];

  return (
    <>
      <PageIntro description={c.description} title={c.title} />
      <section className="page-section compact">
        <div className="content-shell" style={{ display: "grid", gap: "28px" }}>
          <Notice>{c.demoNote}</Notice>

          {checkout ? (
            <div
              style={{
                border: "1px solid #d8d2c4",
                borderRadius: "8px",
                padding: "16px",
                display: "grid",
                gap: "6px",
              }}
            >
              <h2 style={{ margin: 0 }}>{c.confirmationHeading}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {c.reference}: <strong>{checkout.reference}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {c.amount}: {formatMoney(checkout.amount, locale)}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                {c.statusLabel}: {c.pendingPayment}
              </p>
              <p style={{ margin: "6px 0 0" }}>{c.instructions}</p>
            </div>
          ) : null}

          <div>
            <h2>{c.addHeading}</h2>
            <CartActionForm
              action={addToCartAction}
              fields={addFields}
              layout="stack"
              notify={c.notify}
              submitLabel={c.add}
            />
          </div>

          <div>
            <h2>{c.title}</h2>
            {items.length === 0 ? (
              <p className="muted">{c.empty}</p>
            ) : (
              <div style={{ display: "grid", gap: "18px" }}>
                {items.map((item) => {
                  const product = productBySlug.get(item.productId);
                  const title = product ? getLocalizedText(product.title, locale) : item.productId;
                  const lineTotal = multiplyMoney(item.unitPrice, item.quantity);
                  return (
                    <div
                      key={item.productId}
                      style={{ borderBottom: "1px solid #ece7db", paddingBottom: "12px" }}
                    >
                      <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                        {title}{" "}
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {formatMoney(item.unitPrice, locale)} × {item.quantity} ={" "}
                          {formatMoney(lineTotal, locale)}
                        </span>
                      </p>
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        <CartActionForm
                          action={updateQuantityAction}
                          fields={[
                            { kind: "hidden", name: "locale", value: locale },
                            { kind: "hidden", name: "slug", value: item.productId },
                            {
                              kind: "number",
                              name: "quantity",
                              label: c.quantityLabel,
                              defaultValue: String(item.quantity),
                              min: 0,
                              required: true,
                            },
                          ]}
                          notify={c.notify}
                          submitLabel={c.update}
                        />
                        <CartActionForm
                          action={removeItemAction}
                          fields={[
                            { kind: "hidden", name: "locale", value: locale },
                            { kind: "hidden", name: "slug", value: item.productId },
                          ]}
                          notify={c.notify}
                          submitLabel={c.remove}
                        />
                      </div>
                    </div>
                  );
                })}
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {c.subtotal}: {subtotal ? formatMoney(subtotal, locale) : ""}
                </p>
                <CartActionForm
                  action={clearCartAction}
                  fields={[{ kind: "hidden", name: "locale", value: locale }]}
                  notify={c.notify}
                  submitLabel={c.clear}
                />
              </div>
            )}
          </div>

          <div>
            <h2>{s.heading}</h2>
            <div style={{ display: "grid", gap: "14px" }}>
              <CartActionForm
                action={setDestinationAction}
                fields={[
                  { kind: "hidden", name: "locale", value: locale },
                  {
                    kind: "select",
                    name: "country",
                    label: s.countryLabel,
                    required: true,
                    defaultValue: destCountry ?? undefined,
                    options: shippingCountries.map((co) => ({ value: co.code, label: co.name })),
                  },
                ]}
                notify={c.notify}
                submitLabel={s.apply}
              />
              {selectedZone ? (
                <div className="muted" style={{ display: "grid", gap: "4px" }}>
                  <p style={{ margin: 0 }}>
                    {s.zoneLabel}: {s.zones[selectedZone]}
                  </p>
                  <p style={{ margin: 0 }}>{s.guidance[selectedZone]}</p>
                  <p style={{ margin: 0 }}>{s.finalQuoteNote}</p>
                </div>
              ) : null}
              <CartActionForm
                action={setDisplayCurrencyAction}
                fields={[
                  { kind: "hidden", name: "locale", value: locale },
                  {
                    kind: "select",
                    name: "currency",
                    label: s.currencyLabel,
                    required: true,
                    defaultValue: displayCurrency ?? undefined,
                    options: supportedDisplayCurrencies.map((cur) => ({ value: cur, label: cur })),
                  },
                ]}
                notify={c.notify}
                submitLabel={s.apply}
              />
              {convertedSubtotal ? (
                <div className="muted" style={{ display: "grid", gap: "4px" }}>
                  <p style={{ margin: 0 }}>
                    {s.referenceConversion}: {formatMoney(convertedSubtotal, locale)}
                  </p>
                  <p style={{ margin: 0 }}>{s.demoRateNote}</p>
                </div>
              ) : null}
            </div>
          </div>

          {items.length > 0 ? (
            <div>
              <h2>{c.checkoutHeading}</h2>
              <CartActionForm
                action={checkoutAction}
                fields={[{ kind: "hidden", name: "locale", value: locale }]}
                notify={c.notify}
                submitLabel={c.checkout}
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
