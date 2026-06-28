import { CONSTANTS } from "../constants/constants";

export const getStoreStatus = async (_: unknown, data: any, ctx: Context) => {
  const { Shopify_Store_Name } = await ctx.clients.apps
    .getAppSettings(CONSTANTS.appName)
    .then((data: any) => {
      return data;
    });
  const customStoreName = Shopify_Store_Name.split(" ")
    .join("")
    .split("-")
    .join("");
  return await ctx.clients.vtexMasterGetClient
    .getData(
      `/api/dataentities/${CONSTANTS.store}/documents/${customStoreName}?_fields=_all`,
      {},
      ctx
    )
    .then((data) => {
      return JSON.stringify(data);
    });
  return data;
};
