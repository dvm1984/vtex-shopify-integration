export const CONSTANTS = {
  appName: (process.env.VTEX_APP_ID ?? "yourvendor.vtex-shopify-integration").split("@")[0],
  appMajorVersion: "1", // bump on major version upgrades
  cronWorkspace: "master", // set to your deployment workspace
  errMessage: "Updation Not Successful",
  skuError: "skuErrorList",
  productError: "productErrorList",
  paginationDataCount: 5,
  store: "shopifyStoresConnected",
  shopifyApiVersion: "2024-01",
  skuImageURL: "https://via.placeholder.com/600x600.png?text=No+Image",
  bulkProducts: "bulkProducts",
  orderNotifications: "orderNotifications",
  cronStatus: "cronStatus",
  webhookStartMins: 15,
  webhookStartHours: 6,
  webhookEndMins: 45,
  webhookEndHours: 18,
};
