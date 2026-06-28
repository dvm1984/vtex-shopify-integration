import { IOContext, InstanceOptions, JanusClient } from '@vtex/api';
import { CONSTANTS } from '../constants/constants';


export default class vtexPutClient extends JanusClient {


    constructor(context: IOContext, options?: InstanceOptions) {
        super(context, {
            ...options,
            retries: 2,
            headers: {
                'content-type': 'application/json',
                "accept": "application/json",
            }
        })
    }

    public async putData(url: string,data:any,ctx:any) {
        const credentials = await ctx.clients.apps
            .getAppSettings(CONSTANTS.appName)
            .then((data: any) => data);

        const response = await this.http.put(url, data,{
            metric: "put-data",
            headers: {
                'x-vtex-api-appkey': `${credentials.VTEX_APP_KEY}`,
                'x-vtex-api-apptoken': `${credentials.VTEX_APP_TOKEN}`,
            }
        })
        return response;
  
    }
}
