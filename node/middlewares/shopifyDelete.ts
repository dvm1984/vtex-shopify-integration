import fetch from "node-fetch";
import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "./query";

export const deleteData = async (
  url: string,
  ctx: any,
  name: string
): Promise<any> => {
  const Shopify_Store_URL =
    name &&
    (await masterDataQuery(
      ctx,
      CONSTANTS.store,
      `_schema=stores&storeName=${name}&`,
      "storeURL"
    ).then((data) => JSON.parse(data)[0].storeURL));
  const token =
    name &&
    (await masterDataQuery(
      ctx,
      CONSTANTS.store,
      `_schema=stores&storeName=${name}&`,
      "shopifyToken"
    ).then((data) => JSON.parse(data)[0].shopifyToken));

  return await fetch(`${Shopify_Store_URL}/${url}`, {
    method: "delete",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  })
    .then((data) => {
      return data.json();
    })
    .then((data) => {
      return data;
    })
    .catch((err) => console.log(err));
};
