import fetch from "node-fetch";
import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "./query";

export const postData = async (
  url: string,
  data: any,
  ctx: any,
  name?: string
): Promise<any> => {
  const credentials = await ctx.clients.apps
    .getAppSettings(CONSTANTS.appName)
    .then((data: any) => data);

  const Shopify_Store_URL =
    name &&
    (await masterDataQuery(
      ctx,
      CONSTANTS.store,
      `_schema=stores&storeName=${name}&`,
      "storeURL"
    ).then((data) => JSON.parse(data)[0]?.storeURL));
  const token =
    name &&
    (await masterDataQuery(
      ctx,
      CONSTANTS.store,
      `_schema=stores&storeName=${name}&`,
      "shopifyToken"
    ).then((data) => JSON.parse(data)[0]?.shopifyToken));
  return await fetch(
    `${Shopify_Store_URL || credentials?.Shopify_Store_URL}/${url}`,
    {
      method: "post",
      body: JSON.stringify(data),
      headers: {
        "X-Shopify-Access-Token":
          token || credentials?.Shopify_Admin_API_access_token,
        "Content-Type": "application/json",
      },
    }
  )
    .then((data) => {
      return data.json();
    })
    .then((data) => {
      return data;
    })
    .catch((err) => console.log(err));
};
