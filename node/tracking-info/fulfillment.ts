/**
 * Fulfillment webhook handler — receives Shopify fulfillment events
 * and creates/updates invoices in VTEX OMS.
 *
 * Developer: dvm1984 (https://github.com/dvm1984)
 *
 */
import { json } from "co-body";
import { invoice as createInvoice } from "./invoice";
import { updateTrackingInfo } from "./update-tracking-info";
import { FulfillmentType } from "./types";
import { OrderDetailResponse } from "@vtex/clients";

const BetterQueue = require("better-queue");

const processTask = async (
  task: { ctx: Context; fulfillment: FulfillmentType },
  cb: (err?: Error | null) => void,
) => {
  const { ctx, fulfillment } = task;
  try {
    await handleFulfillment(ctx, fulfillment);
    cb();
  } catch (error) {
    cb(error instanceof Error ? error : new Error(String(error)));
  }
};

const queue = new BetterQueue(processTask, {
  afterProcessDelay: 2000,
  maxRetries: 5,
  retryDelay: 5000,
});

export async function getShopifyOrderUpdates(
  ctx: Context,
  next: () => Promise<void>,
) {
  ctx.status = 200;
  const fulfillment = await json(ctx.req);
  queue.push({ id: fulfillment.id, ctx, fulfillment });
  await next();
}

const getVtexOrderId = (name: string) => (name.match(/^[^.]+/) as string[])[0];

export function findInvoiceByNumber(
  vtexOrder: any,
  invoiceNumber: string,
): any | null {
  const invoices: any[] =
    vtexOrder?.invoicedata?.invoices ||
    vtexOrder?.invoiceData?.invoices ||
    vtexOrder?.invoices ||
    [];

  if (!Array.isArray(invoices) || invoices.length === 0) return null;

  return (
    invoices.find((inv: any) => {
      const num = String(
        inv?.invoiceNumber ?? inv?.number ?? inv?.invoice_number ?? "",
      );
      return num === String(invoiceNumber);
    }) || null
  );
}

async function getVtexOrderDetails(
  ctx: Context,
  fulfillment: FulfillmentType,
): Promise<OrderDetailResponse | null> {
  const { vtex: { logger } } = ctx;
  const vtexOrderId = getVtexOrderId(fulfillment.name);

  try {
    return await ctx.clients.vtexGetClient.getData(
      `/api/oms/pvt/orders/${vtexOrderId}`,
      ctx,
    );
  } catch (error) {
    logger.error(
      `VTEX Order ID: ${vtexOrderId}. Shopify Fulfillment ID: ${fulfillment.id}. Failed to fetch order details. Error: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

async function startHandling(orderId: string, ctx: Context) {
  await ctx.clients.vtexPostClient.postData(
    `/api/oms/pvt/orders/${orderId}/start-handling`,
    ctx,
  );
}

export async function handleFulfillment(
  ctx: Context,
  fulfillment: FulfillmentType,
) {
  const { vtex: { logger } } = ctx;

  if (fulfillment.status === "cancelled") return;

  const vtexOrderId = getVtexOrderId(fulfillment.name);

  logger.info(
    `VTEX Order ID: ${vtexOrderId}. Shopify Fulfillment ID: ${fulfillment.id}. Received fulfillment update from Shopify`,
  );

  const vtexOrder: OrderDetailResponse | null = await getVtexOrderDetails(ctx, fulfillment);

  if (!vtexOrder?.orderId) return;

  const existingInvoice = findInvoiceByNumber(vtexOrder, String(fulfillment.id));

  if (existingInvoice) {
    await updateTrackingInfo(fulfillment, vtexOrder, ctx);
  } else if (fulfillment.tracking_number) {
    if ((vtexOrder as any).status === "ready-for-handling") {
      await startHandling(vtexOrder.orderId, ctx);
    }
    await createInvoice(fulfillment, vtexOrder, ctx);
  }
}
