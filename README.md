# KAMISUMI Site Phase 1

Standalone Phase 1 public site for KAMISUMI, operated by KAGURAKOJI and structured for future KAGURAKOJI Commerce Core expansion.

This project is intentionally separate from the existing `maomao-fansite` files.

## Stack

- Next.js App Router
- TypeScript strict
- CSS Modules plus CSS custom properties from the supplied design tokens
- Vitest
- Playwright config for future E2E checks
- Local mock content only

Tailwind is not used because the project pack asks for a Figma-ready token layer and easy visual replacement after the final design pass.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

On this Windows environment, `npm.cmd` may be needed if PowerShell blocks `npm.ps1`.

## Directory Map

```text
src/app/[locale]              Locale routes for zh-tw, ja, and hidden en scaffold
src/components                Layout, product, journal, sourcing, form, SEO, and UI pieces
src/config/site.ts            Brand, operator, store, locale, contact, and channel config
src/content/kamisumi          KAMISUMI-specific mock products, articles, schedules, FAQs
src/dictionaries              Locale dictionaries and status/CTA labels
src/lib                       Locale, route, money, SEO, status, and params helpers
src/repositories/core         Commerce Core repository contracts
src/repositories/kamisumi     Mock KAMISUMI repository implementation
src/types/commerce.ts         Shared Commerce Core entity and money types
public/images/placeholders    Local placeholder visual assets
tests                         Unit and component tests
```

## KAMISUMI vs Commerce Core Boundary

Shared KAGURAKOJI Commerce Core code:

- `src/types/commerce.ts`
- `src/repositories/core/*`
- Money model with integer minor units
- Entity naming for Brand, Store, SalesChannel, Warehouse, Product, JournalPost, SourcingSchedule
- Future fields such as `organizationId`, `brandId`, `storeId`, `warehouseId`, `salesChannelId`, `countryCode`, `currencyCode`, and external IDs

KAMISUMI-specific code:

- `src/config/site.ts`
- `src/content/kamisumi/*`
- `src/dictionaries/*`
- Public copy and Taiwan-first store defaults
- Placeholder imagery and visual tone

UI reads through repository contracts. It does not call Supabase, Shopify, accounting systems, or raw database APIs.

## Mock Data Editing

Edit public mock content here:

- Products: `src/content/kamisumi/products.ts`
- Journal: `src/content/kamisumi/journal.ts`
- Sourcing schedule: `src/content/kamisumi/sourcing.ts`
- FAQ: `src/content/kamisumi/faqs.ts`

Do not add cost, margin, internal supplier notes, bank account numbers, private route details, or customer data to public mock content.

## Figma Replacement Points

After Figma is finalized, update:

- CSS variables in `src/styles/globals.css`
- Component CSS Modules under `src/components/**`
- Placeholder images under `public/images/placeholders`
- Layout density in product, journal, schedule, and form components

## Future Expansion

Phase 2 can add Supabase-backed repositories while keeping the public UI stable:

- `SupabaseCommerceRepository`
- Authenticated admin routes under `/admin`
- RLS policies
- audit logs
- product CRUD
- inventory
- customer records
- sourcing requests
- provisional orders
- journal CMS

Shopify can be added through a separate repository or service layer:

- `ShopifyProductRepository`
- `externalProductId`
- `externalVariantId`
- checkout handoff or Storefront API mode

Accounting export should remain an integration layer, not a custom tax-accounting system:

- accounting date
- tax category
- payment method
- settlement status
- invoice number
- receipt file
- external accounting ID
- journal export status

## Phase 2 Entity Candidates

```text
users
profiles
roles
products
product_translations
product_images
product_variants
product_prices
inventory
inventory_units
inventory_movements
brands
makers
categories
customers
customer_addresses
orders
order_items
payments
shipments
sourcing_requests
sourcing_schedules
journal_posts
journal_translations
media_assets
inquiry_messages
notifications
audit_logs
site_settings
accounting_exports
```

## Deferred by Design

Not implemented in Phase 1:

- Supabase
- production admin system
- inventory management
- cost or profit calculations
- customer data storage
- online payment
- Shopify integration
- accounting integration
- bank account display
- final legal text

## Unresolved Business Decisions

Kept as placeholders or TODO-level configuration:

- final trademark/name checks
- logo direction
- official SNS URLs
- initial real product list
- payment copy
- preorder deposit percentage
- cancellation rules
- Taiwan food-shipping rules
- breakage compensation scope
- operator information display scope
- English launch timing
- production email service
- Shopify timing
- dedicated domain timing
