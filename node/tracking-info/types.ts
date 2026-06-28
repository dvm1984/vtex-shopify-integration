import { LogisticsInfo, OrderItemDetailResponse } from "@vtex/clients";

export type FulfillmentType = {
  id: number;
  order_id: number;
  status: string;
  created_at: string;
  service: string;
  updated_at: string;
  tracking_company: string | null;
  shipment_status: string | null;
  line_items: LineItem[];
  tracking_number: string | null;
  tracking_numbers: string[];
  tracking_url: string | null;
  tracking_urls: string[];
  receipt: Record<string, any>;
  name: string;
};

export type LineItem = {
  id: number;
  variant_id: string;
  title: string;
  price: number;
  quantity: number;
  sku: string;
  variant_title: string;
  vendor: string;
  fulfillment_service: string;
  product_id: number;
  requires_shipping: boolean;
  taxable: boolean;
  gift_card: boolean;
  name: string;
  variant_inventory_management: string;
  properties: any[];
};

export type LogisticsInfoItem = LogisticsInfo & { itemId: string };

export type VtexOrderDetails = Record<
  string,
  { vtexItem: OrderItemDetailResponse; vtexLogisticsItem: LogisticsInfoItem }
>;

export type WebhookConfig = {
  topic: string;
  uri: string;
  format?: "JSON" | "XML";
};

export type WebhookResponse = {
  success: boolean;
  data?: { id?: string; message?: string } & WebhookConfig;
  error?: Error;
};
