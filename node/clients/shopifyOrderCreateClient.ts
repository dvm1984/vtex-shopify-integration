import { IOContext, InstanceOptions, JanusClient } from "@vtex/api";
import { CONSTANTS } from "../constants/constants";
import { postData } from "../middlewares/shopifyPost";
import { getData } from "../middlewares/shopifyGet";

export default class shopifyOrderCreateClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        VtexIdClientAutCookie: context.authToken,
        "X-Vtex-Use-Https": "true",
      },
    });
  }

  public sendOrder = async (
    orderId: string,
    ctx: any,
    storesName: string,
    orderDetails: any,
    shopifyLocation: string
  ): Promise<{ shopifyOrderId: number; fulfillmentOrderId: number } | undefined> => {
    const orderData: any = await ctx.clients.vtexGetClient.getData(orderId, ctx);

    const productData = orderDetails.map((value: any) => ({
      title: value.orderDetail.name,
      price: value.orderDetail.price / 100,
      quantity: value.orderDetail.quantity * value.orderDetail.unitMultiplier,
      variant_id: parseInt(value.orderDetail.refId, 10),
    }));

    const shippingData = orderDetails.map((value: any) => ({
      price: value.logisticsInfo.price / 100,
      title: value.logisticsInfo.selectedSla,
    }));

    let sumTax = 0;
    let shippingPercent = 0;
    let productPercent = 0;
    let storePrice = 0;
    let storeShippingPrice = 0;

    orderDetails.map((value: any) => {
      const priceTags = value.orderDetail.priceTags;
      storePrice +=
        (value.orderDetail.price / 100) *
        (value.orderDetail.quantity * value.orderDetail.unitMultiplier);
      storeShippingPrice += value.logisticsInfo.price / 100;
      for (const tag of priceTags) {
        if (tag.isPercentual === false && tag.name.includes("tax")) {
          sumTax += tag.rawValue;
        } else if (tag.isPercentual && tag.name.includes("tax@shipping")) {
          shippingPercent += tag.rawValue * (value.logisticsInfo.price / 100);
        } else if (tag.isPercentual && tag.name.includes("tax@price")) {
          productPercent +=
            tag.rawValue *
            (value.orderDetail.price / 100) *
            (value.orderDetail.quantity * value.orderDetail.unitMultiplier);
        }
      }
    });

    const storeTax = sumTax + shippingPercent + productPercent;
    const storeTaxRate = storeTax / (storePrice + storeShippingPrice + storeTax);

    const data = await getData(
      `admin/api/${CONSTANTS.shopifyApiVersion}/orders.json?status=any&name=${orderData.orderId}`,
      ctx,
      storesName
    );

    if (data.orders.length == 0) {
      await ctx.clients.vtexPostClient.postData(
        `/api/logistics/pvt/inventory/reservations/${orderDetails[0].orderDetail.lockId}/acknowledge`,
        ctx
      );

      const response = await postData(
        `admin/api/${CONSTANTS.shopifyApiVersion}/orders.json`,
        {
          order: {
            inventory_behaviour: "bypass",
            send_receipt: true,
            line_items: productData,
            tax_lines: [
              {
                title: "VTEX Tax",
                rate: storeTaxRate,
                price: storeTax,
              },
            ],
            fulfillment_status: null,
            customer: {
              first_name: "VTEX",
              last_name: "Customer",
            },
            shipping_lines: shippingData,
            shipping_address: {
              first_name: orderData.shippingData.address.receiverName,
              last_name: ".",
              address1: orderData.shippingData.address.street,
              address2: orderData.shippingData.address.neighborhood,
              city: orderData.shippingData.address.city,
              province: orderData.shippingData.address.state,
              country: orderData.shippingData.address.country,
              zip: orderData.shippingData.address.postalCode,
            },
            total_tax: storeTax,
            currency: orderData.storePreferencesData.currencyCode,
            name: orderData.orderId,
          },
        },
        ctx,
        storesName
      );

      const shopifyOrderId: number = response?.order?.id;

      if (!shopifyOrderId) {
        console.warn(`Order create response missing order ID for VTEX order ${orderId}`);
        return undefined;
      }

      // Fetch fulfillment orders
      const fulfillData = await getData(
        `admin/api/${CONSTANTS.shopifyApiVersion}/orders/${shopifyOrderId}/fulfillment_orders.json`,
        ctx,
        storesName
      );

      const preMoveId: number = fulfillData?.fulfillment_orders?.[0]?.id;
      let fulfillmentOrderId: number = preMoveId;

      if (preMoveId && shopifyLocation) {
        // move.json creates a new fulfillment order at the new location and cancels
        // the original. The response contains moved_fulfillment_order with the new ID.
        // We must use that new ID for fulfillment_request.json — the old ID is cancelled.
        const moveResponse: any = await postData(
          `admin/api/${CONSTANTS.shopifyApiVersion}/fulfillment_orders/${preMoveId}/move.json`,
          {
            fulfillment_order: {
              new_location_id: shopifyLocation,
            },
          },
          ctx,
          storesName
        ).catch((err: any) =>
          console.error(`Failed to move fulfillment order to Express Fulfillment location:`, err)
        );

        const movedId: number = moveResponse?.moved_fulfillment_order?.id;
        if (movedId) {
          fulfillmentOrderId = movedId;
        }
      }

      // Return both IDs directly so getOrderUpdates.ts doesn't need a second lookup
      return { shopifyOrderId, fulfillmentOrderId };
    } else {
      return undefined;
    }
  };
}
