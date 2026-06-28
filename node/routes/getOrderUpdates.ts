import json from "co-body";
import { CONSTANTS } from "../constants/constants";
import { getData } from "../middlewares/shopifyGet";
import { postData } from "../middlewares/shopifyPost";
import { masterDataQuery } from "../middlewares/query";

export async function getOrderUpdates(ctx: Context, next: () => Promise<any>) {
  const body = await json(ctx.req);
  ctx.status = 200;
  if (body["hookConfig"] === "ping") {
    ctx.body = "ping";
  }
  const orderId = body["OrderId"];
  const state = body["State"];

  await ctx.clients.vtexMasterDataPatchClient
    .patchData(
      `/api/dataentities/${CONSTANTS.orderNotifications}/documents/${orderId}`,
      {
        orderId: orderId,
        orderState: state,
      },
      ctx
    )
    .catch((err: any) => console.log(err));

  if (orderId) {
    const orderData: any = await ctx.clients.vtexGetClient.getData(
      `api/oms/pvt/orders/${orderId}`,
      ctx
    );

    const orderDetails: any[] = (orderData.items as any[]).map((value: any) => value);
    const logisticsData: any[] = (orderData.shippingData.logisticsInfo as any[]).map((value: any) => value);

    const inventoryData: any[] = await Promise.all(
      (orderData.shippingData.logisticsInfo as any[]).map(async (value: any) => {
        const warehouseIds = value.deliveryIds[0].warehouseId;
        return ctx.clients.vtexGetClient.getData(
          `api/logistics/pvt/configuration/warehouses/${warehouseIds}`,
          ctx
        );
      })
    );

    const inventoryNames: string[] = inventoryData.map((value: any) => value.name);

    const inventoryObj: any[] = [];
    orderDetails.forEach((orderDetail: any, inv: number) =>
      inventoryObj.push({
        orderDetail,
        inv: inventoryNames[inv],
        logisticsInfo: logisticsData[inv],
      })
    );

    const groupedInv: Record<string, any[]> = inventoryObj.reduce(
      (acc: Record<string, any[]>, item: any) => {
        const key: string = item.inv;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, any[]>
    );
    const uniqueInv: string[] = Object.keys(groupedInv);

    if (orderId && state) {
      if (state === "ready-for-handling") {
        for (let i = 0; i < uniqueInv.length; i++) {
          const storesName: string = uniqueInv[i];

          const shopifyLocation: string = await masterDataQuery(
            ctx,
            CONSTANTS.store,
            `_schema=stores&storeName=${storesName}&`,
            "shopifyLocation"
          )
            .then((res: any) => JSON.parse(res))
            .then((res: any) => res[0]?.shopifyLocation);

          // Create order, move to Express Fulfillment location, get IDs back directly
          const orderResult = await ctx.clients.shopifyOrderCreateClient.sendOrder(
            `api/oms/pvt/orders/${orderId}`,
            ctx,
            storesName,
            groupedInv[storesName],
            shopifyLocation
          );

          if (!orderResult) {
            console.warn(`sendOrder returned no result for VTEX order ${orderId} - order may already exist`);
            continue;
          }

          const { shopifyOrderId, fulfillmentOrderId } = orderResult;

          console.log(`Shopify order ${shopifyOrderId} created for VTEX order ${orderId}`);

          // Adjust inventory explicitly per line item
          const orderItems: any[] = groupedInv[storesName];

          if (shopifyLocation) {
            for (let j = 0; j < orderItems.length; j++) {
              const orderDetail: any = orderItems[j].orderDetail;
              const variantId: string = orderDetail.refId;

              const variantData: any = await getData(
                `admin/api/${CONSTANTS.shopifyApiVersion}/variants/${variantId}.json`,
                ctx,
                storesName
              );
              const variant: any = variantData.variant;

              if (!variant) {
                console.warn(`No Shopify variant found for variant ID: ${variantId}`);
                continue;
              }

              console.log(
                `Adjusting inventory for variant ${variantId}, item_id ${variant.inventory_item_id}, qty -${orderDetail.quantity}`
              );

              await postData(
                `admin/api/${CONSTANTS.shopifyApiVersion}/inventory_levels/adjust.json`,
                {
                  location_id: shopifyLocation,
                  inventory_item_id: variant.inventory_item_id,
                  available_adjustment: -orderDetail.quantity,
                },
                ctx,
                storesName
              ).catch((err: any) =>
                console.error(`Failed to adjust inventory for variant ${variantId}:`, err)
              );
            }
          } else {
            console.warn(
              `No shopifyLocation configured for store: ${storesName}. Skipping inventory adjustment.`
            );
          }

          if (!fulfillmentOrderId) {
            console.warn(`No fulfillment order ID returned for Shopify order ${shopifyOrderId}`);
            continue;
          }

          // Send fulfillment request to Express Fulfillment via the post-Jan 2026
          // Shopify fulfillment orders API. Notifies Express Fulfillment dashboard
          // without marking the order as fulfilled in Shopify.
          const fulfillRequestResponse: any = await postData(
            `admin/api/${CONSTANTS.shopifyApiVersion}/fulfillment_orders/${fulfillmentOrderId}/fulfillment_request.json`,
            {
              fulfillment_request: {
                message: `VTEX order ${orderId} ready for fulfillment.`,
              },
            },
            ctx,
            storesName
          ).catch((error: any) => {
            console.error("Error sending fulfillment request to Express Fulfillment:", error);
          });
          console.log("Fulfillment request response:", fulfillRequestResponse);
        }
      } else if (state === "invoiced") {
        console.log("Invoiced state in Vtex, ", orderId);
      } else if (state === "canceled") {
        for (let i = 0; i < uniqueInv.length; i++) {
          const storesName: string = uniqueInv[i];
          const data: any = await getData(
            `admin/api/${CONSTANTS.shopifyApiVersion}/orders.json?name=${orderId}`,
            ctx,
            storesName
          );
          await postData(
            `admin/api/${CONSTANTS.shopifyApiVersion}/orders/${data.orders[0]?.id}/cancel.json`,
            { restock: true },
            ctx,
            storesName
          );
        }
      }
    } else {
      ctx.body = "ping";
    }
  }
  await next();
}
