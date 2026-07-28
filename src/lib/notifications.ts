export const IMPORTANT_NOTIFICATION_TYPES = [
  "commission_message",
  "commission_request",
  "commission_quote",
  "commission_order",
  "shop_order",
  "shop_fulfillment",
  "shop_refund"
] as const;

export const COMMUNICATION_NOTIFICATION_TYPES = new Set(["commission_message"]);
