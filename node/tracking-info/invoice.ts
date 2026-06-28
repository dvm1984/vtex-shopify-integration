/**
 * Invoice creation — posts a VTEX OMS invoice with tracking info
 * when a Shopify fulfillment is created.
 *
 * Developer: dvm1984 (https://github.com/dvm1984)
 */
import {
  ItemPackage,
  OrderDetailResponse,
  OrderItemDetailResponse,
  PackageDetail,
} from "@vtex/clients";

import {
  FulfillmentType,
  LineItem,
  LogisticsInfoItem,
  VtexOrderDetails,
} from "./types";

function getInvoiceValue(
  items: LineItem[],
  vtexOrderDetails: VtexOrderDetails,
  packages: PackageDetail[] = [],
) {
  const sum = items.reduce((acc: number, item: LineItem) => {
    let tax = 0;

    const detail = vtexOrderDetails[item.variant_id.toString()];
    if (!detail) return acc;

    const { vtexItem, vtexLogisticsItem } = detail;

    const hasPartialInvoiceInVtex = () =>
      packages.some(({ items: packageItems }) =>
        packageItems.some(
          ({ itemIndex }: ItemPackage) =>
            itemIndex === vtexLogisticsItem?.itemIndex,
        ),
      );

    vtexItem?.priceTags?.forEach((tag) => {
      if (tag.isPercentual && tag.name.includes("tax@shipping") && !hasPartialInvoiceInVtex()) {
        tax += (tag.rawValue * (vtexLogisticsItem?.price || 0)) / 100;
      } else if (tag.isPercentual && tag.name.includes("tax@price")) {
        tax += tag.rawValue * item.price * item.quantity;
      }
    });

    const shippingCost = hasPartialInvoiceInVtex()
      ? 0
      : (vtexLogisticsItem?.price || 0) / 100;

    return acc + (item.price * item.quantity + tax + shippingCost);
  }, 0);

  return Math.round(sum * 100);
}

function getVtexOrderDetails(
  items: LineItem[],
  vtexOrder: OrderDetailResponse,
): VtexOrderDetails {
  const orderItem = {} as VtexOrderDetails;

  items.forEach((item: LineItem) => {
    const variantId = item.variant_id.toString();

    const vtexItem = vtexOrder.items.find(
      (orderItem: OrderItemDetailResponse) =>
        orderItem.refId?.toString() === variantId,
    );

    const logisticsInfo =
      (vtexOrder.shippingData?.logisticsInfo as LogisticsInfoItem[]) || [];

    const vtexLogisticsItem = logisticsInfo.find(
      (logisticsItem: LogisticsInfoItem) =>
        logisticsItem?.itemId?.toString() === vtexItem?.id?.toString(),
    );

    if (!vtexItem || !vtexLogisticsItem) {
      throw new Error(
        `Failed to match Shopify variant ${variantId} with VTEX order items`,
      );
    }

    orderItem[variantId] = { vtexItem, vtexLogisticsItem };
  });

  return orderItem;
}

function getItems(items: LineItem[], vtexOrderDetails: VtexOrderDetails) {
  return items.map((item: LineItem) => {
    const { vtexItem } = vtexOrderDetails[item.variant_id.toString()];
    return {
      quantity: item.quantity / (vtexItem?.unitMultiplier || 1),
      id: vtexItem?.id,
    };
  });
}

function getInvoiceInfo(
  fulfillment: FulfillmentType,
  vtexOrder: OrderDetailResponse,
) {
  const vtexOrderDetails = getVtexOrderDetails(fulfillment.line_items, vtexOrder);

  return {
    type: "Output",
    issuanceDate: fulfillment.created_at,
    invoiceNumber: fulfillment.id.toString(),
    invoiceValue: getInvoiceValue(
      fulfillment.line_items,
      vtexOrderDetails,
      vtexOrder.packageAttachment?.packages || [],
    ),
    courier: fulfillment.tracking_company || "",
    trackingNumber: fulfillment.tracking_number || "",
    trackingUrl: fulfillment.tracking_url || "",
    items: getItems(fulfillment.line_items, vtexOrderDetails),
  };
}

export async function invoice(
  fulfillment: FulfillmentType,
  vtexOrder: OrderDetailResponse,
  ctx: Context,
) {
  const { vtex: { logger } } = ctx;

  try {
    await ctx.clients.vtexPostClient.postData(
      `/api/oms/pvt/orders/${vtexOrder.orderId}/invoice`,
      ctx,
      getInvoiceInfo(fulfillment, vtexOrder),
    );

    logger.info(
      `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. Invoice created`,
    );
  } catch (error) {
    logger.error(
      `VTEX Order ID: ${vtexOrder.orderId}. Shopify Fulfillment ID: ${fulfillment.id}. Failed to create invoice. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
