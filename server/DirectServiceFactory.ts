/*
Each request would instantiate an instance of DirectBackend.

The backend tracks all `get` requests initiated by a view. Server can wait for these requests to
finish before rendering a view to string.

The `get` requests load data into the store associated with the backend.
*/

import {
  ServerService,
  ServerServices,
  Cursor,
  RequestContext,
  Service,
  ServiceFactory,
  Store,
} from "../index";

export class DirectServiceFactory implements ServiceFactory {
  store: Store;
  services: ServerServices;
  context: RequestContext;

  private _promises: Promise<any>[] = [];

  constructor(services: ServerServices, store: Store, context: RequestContext) {
    this.services = services;
    this.store = store;
    this.context = context;
  }

  service(name: string): Service {
    const service = this.services[name];
    const substore = this.store.select(name);
    return new DirectService(this, service, substore, this.context);
  }

  registerGetPromise(promise: Promise<any>) {
    this._promises.push(promise);
  }

  get hasPendingLoadRequests() {
    return this._promises.length > 0;
  }

  async waitLoadRequests() {
    const results = await Promise.all(this._promises);
    this._promises.length = 0;
    return results;
  }
}

class DirectService implements Service {
  service: ServerService<any>;
  store: Store;
  context: RequestContext;
  parent: DirectBackend;

  constructor(parent: DirectBackend, service: ServerService<any>, store: Store, context: RequestContext) {
    this.parent = parent;
    this.service = service;
    this.store = store;
    this.context = context;
  }

  // Register get promises with backend.
  get(method: string, payload: any): Promise<any> {
    const getPromise = new Promise(async (resolve, reject) => {
      try {
        const result = await invokeGet(this.context, this.service, method, payload);
        this.store.set(result);
        resolve(result);
      } catch(err) {
        reject(err);
      }
    });

    this.parent.registerGetPromise(getPromise);

    return getPromise;
  }

  post(method: string, payload: any) {
    throw new Error("Local service is read only");
  }
}

async function invokeGet<Context>(
  requestContext: RequestContext,
  service: ServerService<Context>,
  method: string,
  payload) {
  // build context
  let context: Context;
  if (service.context) {
    context = await service.context(requestContext);
  }

  const handler = service.get[method];
  if (handler == null) {
    throw new Error(`Unknown action: ${service.name}.${method}`)
  }

  return handler(payload, context);
}
