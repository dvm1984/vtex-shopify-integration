import { OrderDetailResponse } from "@vtex/clients";
import { FulfillmentType } from "./types";
import { findInvoiceByNumber } from "./fulfillment";

function buildTrackingPayload(fulfillment: FulfillmentType): Record<string, string> {
  const payload: Record<string, string> = {};
  if (fulfillment.tracking_company) payload.courier = fulfillment.tracking_company;
  if (fulfillment.tracking_number) payload.trackingNumber = fulfillment.tracking_number;
  if (fulfillment.tracking_url) payload.trackingUrl = fulfillment.tracking_url;
  return payload;
}

async function findVtexInvoiceId(
  ctx: Context,
  orderId: string,
  fulfillmentId: string,
): Promise<string | null> {
  const order = await ctx.clients.vtexGetClient
    .getData(`/api/oms/pvt/orders/${orderId}`, ctx)
    .catch(() => null);

  const match = findInvoiceByNumber(order, fulfillmentId);
  return match?.id ? String(match.id) : null;
}

export async function updateTrackingInfo(
  fulfillment: FulfillmentType,
  vtexOrder: OrderDetailResponse,
  ctx: Context,
) {
  const { vtex: { logger } } = ctx;

  try {
    const payload = buildTrackingPayload(fulfillment);

    if (!payload.courier && !payload.trackingNumber && !payload.trackingUrl) {
      logger.info(
        `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. No tracking fields — skipping update`,
      );
      return;
    }

    const invoiceId = await findVtexInvoiceId(ctx, vtexOrder.orderId, String(fulfillment.id));

    if (!invoiceId) {
      logger.warn(
        `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. No matching VTEX invoice found — skipping`,
      );
      return;
    }

    await ctx.clients.vtexPutClient.putData(
      `/api/oms/pvt/orders/${vtexOrder.orderId}/invoice/${invoiceId}`,
      payload,
      ctx,
    );

    logger.info(
      `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. Invoice ${invoiceId} updated with tracking`,
    );
  } catch (error) {
    logger.error(
      `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. Failed to update invoice. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
