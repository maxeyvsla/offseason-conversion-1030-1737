export const PRODUCT_TIERS = {
  TIER_1: {
    productIds: [1268093, 1728941, 1728943, 1728945, 1728946, 1728947, 1742285, 1742301, 1742312],
    offseasonVSD: 110,
    winterVSD: 165,
  },
  TIER_2: {
    productIds: [1268102, 1268103, 1750655, 1742289, 1742291, 1742304, 1742306, 1742313, 1742315, 1742361, 1742362],
    offseasonVSD: 100,
    winterVSD: 145,
  },
  TIER_3: {
    productIds: [1268104, 1268105, 1742293, 1742298, 1742307, 1742310, 1742317, 1742321, 1742365, 1742368, 1742370, 1742372, 1742374, 1742375],
    offseasonVSD: 90,
    winterVSD: 130,
  },
} as const;

export type ProductTier = keyof typeof PRODUCT_TIERS;