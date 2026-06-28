import { IOContext, InstanceOptions, ExternalClient } from '@vtex/api';
import { CONSTANTS } from '../constants/constants';


export default class vtexPriceClient extends ExternalClient {


    constructor(context: IOContext, options?: InstanceOptions) {
        super('https://api.vtex.com',context, {
            ...options,
            retries: 2,
            headers: {
                'content-type': 'application/json',
                "accept": "application/json",
            }
        })
    }

    public async putData(url: string,data:any,ctx:any) {
        const accountName=ctx.header["x-vtex-account"];

        const credentials = await ctx.clients.apps
            .getAppSettings(CONSTANTS.appName)
            .then((data: any) => data);

        const response = await this.http.put(`${accountName}${url}`, data,{
            metric: "put-data",
            headers: {
                'x-vtex-api-appkey': `${credentials.VTEX_APP_KEY}`,
                'x-vtex-api-apptoken': `${credentials.VTEX_APP_TOKEN}`,
            }
        })
        return response;
  
    }
}
