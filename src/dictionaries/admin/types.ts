import type { AdminNavKey } from "@/lib/commerce/adminNav";

/** 管理画面の表示言語（公開 locale とは別に profiles.admin_locale で保持）。 */
export type AdminLocale = "ja" | "zh-tw";

export type AdminDictionary = {
  adminLocaleName: string;
  nav: Record<AdminNavKey, string>;
  common: {
    save: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    restore: string;
    publish: string;
    unpublish: string;
    search: string;
    status: string;
    actions: string;
    signedInAs: string;
    languageLabel: string;
    noPermission: string;
    confirm: string;
    apply: string;
    quantity: string;
    reason: string;
    note: string;
    customerNote: string;
    internalNote: string;
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    viewHistory: string;
    reopen: string;
  };
  /** 管理画面サインイン（Supabase 認証モード）。 */
  auth: {
    signInTitle: string;
    intro: string;
    email: string;
    password: string;
    signIn: string;
    signOut: string;
    invalidCredentials: string;
    missingFields: string;
    mockNote: string;
    goToAdmin: string;
  };
  /** 業務設定（§8）画面のラベル。 */
  settings: {
    title: string;
    intro: string;
    groups: { brand: string; sales: string; content: string };
    fields: {
      contact_email: string;
      social_threads: string;
      social_instagram: string;
      hold_hours: string;
      order_accepting: string;
      restock_accept: string;
    };
    on: string;
    off: string;
    provisional: string;
    nonEditableNote: string;
    history: string;
    noHistory: string;
    publicReflectNote: string;
  };
  /** 仕入先管理（§12）画面のラベル。 */
  suppliers: {
    title: string;
    intro: string;
    name: string;
    region: string;
    country: string;
    publicLevel: string;
    contact: string;
    note: string;
    levels: { public: string; brand_only: string; region_only: string; private: string };
    empty: string;
    confidentialNote: string;
  };
  /** 抹茶ロット管理（§12）画面のラベル。 */
  matchaLots: {
    title: string;
    intro: string;
    productId: string;
    lotCode: string;
    teaHouse: string;
    bestBefore: string;
    purchasedOn: string;
    storageLocation: string;
    quantity: string;
    available: string;
    adjust: string;
    delta: string;
    empty: string;
    alertExpired: string;
    alertApproaching: string;
    alertOk: string;
  };
  /** 陶器個体管理（§12）画面のラベル。 */
  ceramicUnits: {
    title: string;
    intro: string;
    productId: string;
    unitCode: string;
    cost: string;
    costHidden: string;
    dimensions: string;
    glaze: string;
    condition: string;
    boxIncluded: string;
    inspection: string;
    status: string;
    empty: string;
    statuses: { available: string; reserved: string; sold: string; archived: string };
  };
  /** 仕入・買付管理（§12）画面のラベル。 */
  purchases: {
    title: string;
    intro: string;
    purchasedOn: string;
    supplier: string;
    ancillary: string;
    domesticShipping: string;
    transport: string;
    otherExpense: string;
    itemDescription: string;
    itemQuantity: string;
    itemUnitPrice: string;
    allocate: string;
    method: string;
    ancillaryTotal: string;
    items: string;
    allocations: string;
    empty: string;
    toSuppliers: string;
    toPurchases: string;
    methods: { quantity: string; purchase_value: string; none: string };
  };
  /** 入金管理（§12）画面のラベル。 */
  payments: {
    title: string;
    intro: string;
    orderId: string;
    expectedAmount: string;
    paidAmount: string;
    paymentType: string;
    matchingNumber: string;
    recordReceipt: string;
    empty: string;
    noBankNote: string;
  };
  /** SNS 投稿下書き（§Phase3）画面のラベル。 */
  snsDrafts: {
    title: string;
    intro: string;
    platform: string;
    draftTitle: string;
    shortDescription: string;
    body: string;
    approve: string;
    reject: string;
    status: string;
    pending: string;
    approved: string;
    rejected: string;
    empty: string;
    noAutoPublishNote: string;
  };
  /** メディア管理（§9）画面のラベル。 */
  media: {
    title: string;
    intro: string;
    kind: string;
    bucket: string;
    path: string;
    mimeType: string;
    altJa: string;
    altZh: string;
    privateNote: string;
    empty: string;
    kinds: {
      product: string;
      journal: string;
      brand: string;
      receipt: string;
      sourcing_proof: string;
      customer: string;
      internal: string;
    };
  };
  /** 会計 export（§12）画面のラベル。 */
  accounting: {
    title: string;
    intro: string;
    idempotencyKey: string;
    runExport: string;
    pendingEntries: string;
    status: string;
    entryCount: string;
    exportedAt: string;
    empty: string;
    boundaryNote: string;
  };
  /** 手動振込 注文台帳（公開 checkout 由来の mock 注文）画面のラベル。 */
  checkoutOrders: {
    title: string;
    intro: string;
    reference: string;
    items: string;
    amount: string;
    orderStatus: string;
    paymentStatus: string;
    placedAt: string;
    confirmPayment: string;
    cancelOrder: string;
    empty: string;
    mockNote: string;
  };
  /** 操作履歴（監査ログ）画面のラベル。 */
  auditLog: {
    title: string;
    intro: string;
    actor: string;
    action: string;
    entity: string;
    summary: string;
    at: string;
    empty: string;
    filters: string;
    all: string;
    queryLabel: string;
    queryPlaceholder: string;
    from: string;
    to: string;
    apply: string;
    reset: string;
    showing: string;
    noMatch: string;
    exportCsv: string;
  };
  /** ダッシュボード指標ラベル。 */
  dashboard: {
    bestBeforeAlerts: string;
    suppliers: string;
    purchases: string;
    payments: string;
    shipments: string;
  };
  /** 利益分析（§12）画面のラベル。 */
  profit: {
    title: string;
    intro: string;
    revenue: string;
    cost: string;
    grossProfit: string;
    grossMargin: string;
    shippingBorne: string;
    fees: string;
    contributionProfit: string;
    assumptions: string;
  };
  /** 経費管理（§12）画面のラベル。 */
  expenses: {
    title: string;
    intro: string;
    date: string;
    category: string;
    amount: string;
    note: string;
    total: string;
    empty: string;
    categories: {
      shipping_supplies: string;
      transport: string;
      fees: string;
      rent: string;
      utilities: string;
      marketing: string;
      other: string;
    };
  };
  /** 配送管理（§12）画面のラベル。 */
  shipments: {
    title: string;
    intro: string;
    orderId: string;
    carrier: string;
    method: string;
    tracking: string;
    actualCost: string;
    chargedCost: string;
    empty: string;
  };
  /** CommerceErrorCode と success に対応する通知文言。 */
  notify: {
    success: string;
    forbidden: string;
    not_found: string;
    validation: string;
    invalid_transition: string;
    insufficient_stock: string;
    negative_stock: string;
    duplicate_operation: string;
    conflict: string;
    not_purchasable: string;
    error: string;
  };
};
