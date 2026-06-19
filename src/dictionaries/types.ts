import type {
  JournalCategory,
  ProductCategory,
  ProductStatus,
  SourcingScheduleStatus,
} from "@/types/commerce";

export type StatusPresentation = {
  label: string;
  cta: string;
  tone: "available" | "notice" | "waiting" | "closed";
};

export type Dictionary = {
  localeName: string;
  nav: {
    shop: string;
    newArrivals: string;
    sourcing: string;
    journal: string;
    editions: string;
    about: string;
    order: string;
    shipping: string;
    faq: string;
    contact: string;
  };
  common: {
    skipToContent: string;
    mainNavigationLabel: string;
    footerNavigationLabel: string;
    languageSwitcherLabel: string;
    breadcrumbLabel: string;
    openMenu: string;
    closeMenu: string;
    viewProducts: string;
    viewSchedule: string;
    readMore: string;
    learnMore: string;
    comingSoon: string;
    byOperator: string;
    demoNotice: string;
    required: string;
    optional: string;
    notSaved: string;
    backToHome: string;
    noItems: string;
    product: string;
    article: string;
    breadcrumbHome: string;
    referencePrice: string;
    officialPrice: string;
    shippingAfterConfirm: string;
    commerceCoreNote: string;
  };
  productFields: {
    brand: string;
    region: string;
    sku: string;
    dispatch: string;
    weight: string;
    usucha: string;
    koicha: string;
    bitterness: string;
    umami: string;
    aroma: string;
    sweetness: string;
    use: string;
    dimensions: string;
    capacity: string;
    material: string;
    glaze: string;
    microwave: string;
    dishwasher: string;
    yes: string;
    no: string;
  };
  categories: Record<ProductCategory, string>;
  journalCategories: Record<JournalCategory, string>;
  productStatus: Record<ProductStatus, StatusPresentation>;
  scheduleStatus: Record<SourcingScheduleStatus, string>;
  forms: {
    name: string;
    email: string;
    contactHandle: string;
    country: string;
    desiredItem: string;
    itemUrl: string;
    quantity: string;
    budget: string;
    deadline: string;
    alternatives: string;
    message: string;
    agreement: string;
    submit: string;
    success: string;
    emailError: string;
    requiredError: string;
  };
  account: {
    title: string;
    description: string;
    loginRequired: string;
    loginRequiredHint: string;
    signedInAs: string;
    demoNote: string;
    profileHeading: string;
    addressesHeading: string;
    noAddresses: string;
    addAddressHeading: string;
    editAddressHeading: string;
    saveProfile: string;
    saveAddress: string;
    addAddress: string;
    fields: {
      name: string;
      email: string;
      contactHandle: string;
      country: string;
      phone: string;
      preferredLocale: string;
      recipientName: string;
      postalCode: string;
      line1: string;
      line2: string;
      city: string;
      region: string;
    };
    notify: {
      success: string;
      error: string;
      forbidden: string;
      validation: string;
      not_found: string;
    };
  };
  cart: {
    title: string;
    description: string;
    demoNote: string;
    empty: string;
    addHeading: string;
    productLabel: string;
    quantityLabel: string;
    add: string;
    update: string;
    remove: string;
    clear: string;
    subtotal: string;
    checkoutHeading: string;
    checkout: string;
    confirmationHeading: string;
    reference: string;
    amount: string;
    statusLabel: string;
    pendingPayment: string;
    instructions: string;
    notify: {
      success: string;
      error: string;
      forbidden: string;
      validation: string;
      not_found: string;
    };
  };
  pages: {
    home: {
      eyebrow: string;
      title: string;
      subtitle: string;
      currentSales: string;
      currentSalesLead: string;
      weeklySourcing: string;
      weeklySourcingLead: string;
      selectTitle: string;
      selectLead: string;
      journalTitle: string;
      editionsTitle: string;
      editionsLead: string;
      aboutLead: string;
      orderTitle: string;
      orderSteps: string[];
    };
    shop: { title: string; description: string };
    newArrivals: { title: string; description: string };
    sourcingSchedule: { title: string; description: string };
    sourcingRequest: { title: string; description: string };
    journal: { title: string; description: string };
    about: { title: string; description: string; paragraphs: string[] };
    order: { title: string; description: string; steps: string[] };
    shipping: { title: string; description: string; notes: string[] };
    faq: { title: string; description: string };
    contact: { title: string; description: string };
    legal: { title: string; description: string };
    privacy: { title: string; description: string };
    notFound: { title: string; description: string };
    error: { title: string; description: string; retry: string };
  };
};
