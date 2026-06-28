import { CONSTANTS } from "../constants/constants";
import { deleteData } from "../middlewares/shopifyDelete";
import { getData } from "../middlewares/shopifyGet";

export const deleteStores = async (_: unknown, data: any, ctx: Context) => {
  const accountName = ctx.header["x-forwarded-host"];

  const updateHookId = await getData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
    ctx,
    data.data
  )
    .then((data) => data.webhooks)
    .then((data) => {
      return data.filter(
        (elem: any) => elem.address == `https://${accountName}/product-update`
      )[0]?.id;
    });

  const deleteHookId = await getData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
    ctx,
    data.data
  )
    .then((data) => data.webhooks)
    .then((data) => {
      return data.filter(
        (elem: any) => elem.address == `https://${accountName}/product-deletion`
      )[0]?.id;
    });

  const createHookId = await getData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
    ctx,
    data.data
  )
    .then((data) => data.webhooks)
    .then((data) => {
      return data.filter(
        (elem: any) => elem.address == `https://${accountName}/product-creation`
      )[0]?.id;
    });

  await deleteData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks/${updateHookId}.json`,
    ctx,
    data.data
  );
  await deleteData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks/${deleteHookId}.json`,
    ctx,
    data.data
  );
  await deleteData(
    `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks/${createHookId}.json`,
    ctx,
    data.data
  );
  await ctx.clients.vtexDeleteClient
    .deleteData(
      `/api/dataentities/${CONSTANTS.store}/documents/${data?.data}`,
      ctx
    )
    .then((el) => console.log(el));
  return data;
};
