import { IOContext, InstanceOptions, JanusClient } from "@vtex/api";
import { CONSTANTS } from "../constants/constants";

export default class vtexMasterGetClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      retries: 2,
      headers: {
        "content-type": "application/json",
        accept: "application/vnd.vtex.ds.v10+json",
      },
    });
  }

  public async getData(url: string, headers: any, ctx: any) {
    const credentials = await ctx.clients.apps
      .getAppSettings(CONSTANTS.appName)
      .then((data: any) => data);

    const response = await this.http
      .get(url, {
        metric: "get-data",
        headers: {
          "x-vtex-api-appkey": `${credentials.VTEX_APP_KEY}`,
          "x-vtex-api-apptoken": `${credentials.VTEX_APP_TOKEN}`,
          ...headers,
        },
      })
      .then((data) => {
        return data;
      });
    return response;
  }
}
