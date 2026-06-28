import { CONSTANTS } from "../constants/constants";

export async function getCurrentStore(_: unknown, __: unknown, ctx: Context) {
  console.log("storeInDb");
  const data = await ctx.clients.apps
    .getAppSettings(CONSTANTS.appName)
    .then((data) => data);
  const customStoreName = data.Shopify_Store_Name.split(" ")
    .join("")
    .split("-")
    .join("");
  const storeInDb = await ctx.clients.vtexMasterGetClient.getData(
    `/api/dataentities/${CONSTANTS.store}/documents/${customStoreName}?_fields=_all`,
    {},
    ctx
  );

  if (storeInDb) {
    return JSON.stringify({
      Shopify_Store_Name: data.Shopify_Store_Name,
      Shopify_Store_URL: data.Shopify_Store_URL,
    });
  } else
    return JSON.stringify({
      Shopify_Store_Name: "",
      Shopify_Store_URL: "",
    });
}
