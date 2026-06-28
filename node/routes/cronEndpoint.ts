import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { postData } from "../middlewares/shopifyPost";
import { shopifyWebhooksStatus } from "../resolvers/syncProducts";

export async function cronEndpoint(ctx: Context, next: () => Promise<any>) {
  const accountName = ctx.header["x-forwarded-host"];
  const currentTime = new Date();
  const currentMin = currentTime.getMinutes();
  await ctx.clients.vtexMasterDataPatchClient
    .patchData(
      `/api/dataentities/${CONSTANTS.cronStatus}/documents/1`,
      {
        lastCalledTime: new Date(),
      },
      ctx
    )
    .catch((err: any) => console.log(err));
  if (
    currentMin == CONSTANTS.webhookStartMins ||
    currentMin == CONSTANTS.webhookEndMins
  ) {
    const storesList = await masterDataQuery(
      ctx,
      CONSTANTS.store,
      "",
      "storeName,status"
    ).then((data) => JSON.parse(data));
    storesList
      .filter((elem: any) => elem.status == "connected")
      .forEach(async ({ storeName: storesName }: { storeName: string }) => {
        try {
          const webhookUpdateData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-update`,
            storesName
          );
          if (webhookUpdateData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-update`,
                  topic: "products/update",
                  format: "json",
                },
              },
              ctx,
              storesName
            );
          }
          const webhookCreateData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-creation`,
            storesName
          );
          if (webhookCreateData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-creation`,
                  topic: "products/create",
                  format: "json",
                },
              },
              ctx,
              storesName
            );
          }
          const webhookDeleteData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-deletion`,
            storesName
          );
          if (webhookDeleteData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-deletion`,
                  topic: "products/delete",
                  format: "json",
                },
              },
              ctx,
              storesName
            );
          }
          await ctx.clients.vtexMasterDataPatchClient
            .patchData(
              `/api/dataentities/${CONSTANTS.cronStatus}/documents/1`,
              {
                status: "webhooks connected",
                lastConnectedTime: new Date(),
              },
              ctx
            )
            .catch((err: any) => console.log(err));
        } catch (err) {
          await ctx.clients.vtexMasterDataPatchClient.patchData(
            `/api/dataentities/${CONSTANTS.cronStatus}/documents/1`,
            {
              status: "webhooks not connected",
              lastErrorThrownTime: new Date(),
            },
            ctx
          );
          console.log(err);
        }
      });
  }
  ctx.status = 200;
  await next();
}
