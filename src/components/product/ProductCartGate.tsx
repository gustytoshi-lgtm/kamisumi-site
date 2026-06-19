"use client";

import { useEffect, useState } from "react";
import { addToCartAction } from "@/app/[locale]/(public)/cart/actions";
import { CartActionForm } from "@/components/cart/CartActionForm";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/dictionaries";
import { MAX_CART_QUANTITY } from "@/lib/commerce/cart";

type Props = {
  cart: Dictionary["cart"];
  locale: Locale;
  slug: string;
};

export function ProductCartGate({ cart, locale, slug }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/features/cart", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (active) setEnabled(data.enabled === true);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <CartActionForm
      action={addToCartAction}
      fields={[
        { kind: "hidden", name: "locale", value: locale },
        { kind: "hidden", name: "slug", value: slug },
        { kind: "hidden", name: "redirectToCart", value: "true" },
        {
          kind: "number",
          name: "quantity",
          label: cart.quantityLabel,
          defaultValue: "1",
          min: 1,
          max: MAX_CART_QUANTITY,
          required: true,
        },
      ]}
      notify={cart.notify}
      submitLabel={cart.add}
    />
  );
}
