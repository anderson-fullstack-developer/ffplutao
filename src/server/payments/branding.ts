import { serverEnv } from "../env";
import type { Stripe } from "./stripe";

/**
 * Aparência da página de pagamento (Stripe Checkout) com as cores da Plutão Shop.
 * Cores = tokens do tema (styles.css) convertidos de oklch para hex.
 */
export const BRAND_ICON_PUBLIC_ID = "plutao-shop/brand/icon";

export function checkoutBranding(): Stripe.Checkout.SessionCreateParams.BrandingSettings {
  const { CLOUDINARY_CLOUD_NAME } = serverEnv();
  return {
    display_name: "Plutão Shop",
    background_color: "#0c0a08", // --background
    button_color: "#feb41f", // --primary (dourado)
    border_style: "rounded",
    font_family: "chakra_petch", // a mesma letra dos títulos do site
    icon: {
      type: "url",
      url: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${BRAND_ICON_PUBLIC_ID}.png`,
    },
  };
}
