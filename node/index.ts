import {
  ClientsConfig,
  EventContext,
  LRUCache,
  method,
  ParamsContext,
  RecorderState,
  ServiceContext,
} from "@vtex/api";
import { Service } from "@vtex/api";
import { Clients } from "./clients/index";
import { submitHandler } from "./events/formSubmission";
import { mutations, queries } from "./resolvers";
import { getInitialProducts } from "./routes/getInitialProducts";
import { getShopifyOrderUpdates } from "./tracking-info/fulfillment";
import { getProductUpdates } from "./routes/getProductUpdates";
import { getOrderUpdates } from "./routes/getOrderUpdates";
import { productDeletion } from "./routes/productDeletion";
import { createProduct } from "./routes/createProduct";
import { activePoint } from "./routes/activePoint";
import { installHandler } from "./events/appInstalled";
import { cronEndpoint } from "./routes/cronEndpoint";

const TIMEOUT_MS = 10000;

const memoryCache = new LRUCache<string, any>({ max: 5000 });

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    status: {
      memoryCache,
    },
  },
};

declare global {
  type Context = ServiceContext<Clients>;

  interface State extends RecorderState {}
  interface InstalledAppEvent extends EventContext<Clients> {
    body: { id?: string };
  }
}

export default new Service<Clients, RecorderState, ParamsContext>({
  clients,
  graphql: {
    resolvers: {
      Query: queries,
      Mutation: mutations,
    },
  },
  routes: {
    getProducts: method({
      GET: [getInitialProducts],
    }),
    activePoint: method({
      GET: [activePoint],
    }),
    cronEndpoint: method({
      GET: [cronEndpoint],
    }),
    productUpdate: method({
      POST: [getProductUpdates],
    }),
    createProduct: method({
      POST: [createProduct],
    }),
    updateOrder: method({
      POST: [getOrderUpdates],
    }),
    productDeletion: method({
      POST: [productDeletion],
    }),
    createFulfillment: method({
      POST: [getShopifyOrderUpdates],
    }),
    updateFulfillment: method({
      POST: [getShopifyOrderUpdates],
    }),
  },
  events: {
    onSettingsChanged: submitHandler,
    onAppInstalled: installHandler,
  },
});
