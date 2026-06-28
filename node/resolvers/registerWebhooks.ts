import { CONSTANTS } from "../constants/constants";

export const registerWebhooks = async (_: unknown, data: any, ctx: Context) => {
  const accountName = ctx.header["x-forwarded-host"];
  console.log("...............", data);
  const existingCronList = await ctx.clients.vtexGetClient.getData(
    `/api/scheduler/${CONSTANTS.cronWorkspace}/${CONSTANTS.appName}?version=${CONSTANTS.appMajorVersion}`,
    ctx
  );
  if (!existingCronList.length) {
    await ctx.clients.vtexPostClient.postData(
      `/api/scheduler/${CONSTANTS.cronWorkspace}/${CONSTANTS.appName}?version=${CONSTANTS.appMajorVersion}`,
      ctx,
      {
        request: {
          uri: `https://${accountName}/cron-point`,
          method: "GET",
          headers: null,
          body: null,
        },
        scheduler: {
          endDate: "2099-01-01T00:00:00+00:00",
          expression: "* * * * *",
        },
      }
    );
  }
};
