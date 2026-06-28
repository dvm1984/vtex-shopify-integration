import { IOContext, InstanceOptions, JanusClient } from "@vtex/api";
import { CONSTANTS } from "../constants/constants";

export default class vtexPostClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      retries: 2,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
    });
  }

  public async postData(url: string, ctx: any, data?: any) {
    const credentials = await ctx.clients.apps
      .getAppSettings(CONSTANTS.appName)
      .then((data: any) => data);

    if (data) {
      const response = await this.http
        .post(url, data, {
          metric: "post-data",
          headers: {
            "x-vtex-api-appkey": `${credentials.VTEX_APP_KEY}`,
            "x-vtex-api-apptoken": `${credentials.VTEX_APP_TOKEN}`,
          },
        })
        .catch((err) => console.log(err));
      return response;
    } else {
      const response = await this.http.post(url, "", {
        metric: "post-data",
        headers: {
          "x-vtex-api-appkey": `${credentials.VTEX_APP_KEY}`,
          "x-vtex-api-apptoken": `${credentials.VTEX_APP_TOKEN}`,
        },
      });
      return response;
    }
  }
}
