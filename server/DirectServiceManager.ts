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
  ServiceManager,
  Store,
} from "../index";

import invokeService from "./invokeService";

export class DirectServiceManager implements ServiceManager {
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
    if (service === undefined) {
      throw new Error(`Unknown service: ${name}`);
    }
    return new DirectService(this, name, substore, this.context);
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
  // service: ServerService<any>;
  store: Store;
  context: RequestContext;
  parent: DirectServiceManager;
  name: string;

  constructor(parent: DirectServiceManager, name: string, store: Store, context: RequestContext) {
    this.parent = parent;
    // this.service = service;
    this.store = store;
    this.context = context;
    this.name = name;
  }

  // Register get promises with backend.
  get(method: string, payload: any): Promise<any> {
    const getPromise = new Promise(async (resolve, reject) => {
      try {
        const result = await invokeService("get", this.context, this.parent.services, this.name, method, payload);
        const methodStore = this.store.select(method);
        methodStore.set(result);
        resolve(result);
      } catch (err) {
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

