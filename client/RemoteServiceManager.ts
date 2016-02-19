const fetch = require("node-fetch");

import {
  JSON_PAYLOAD_HEADER,

  Store,
  ServiceManager,
  Service,

  RequestType,

  GetResponse,

  PostRequest,
  PostResponse,
} from "../index";

export class RemoteServiceManager implements ServiceManager {
  store: Store;

  private _promises: Promise<any>[] = [];

  apiRootURL: string;

  constructor(store: Store, url: string) {
    this.store = store;
    this.apiRootURL = url;
  }

  service(name: string): Service {
    const substore = this.store.select(name);
    return new RemoteService(this, name, substore);
  }

  async invokeServiceGet(serviceName, methodName, payload: any): Promise<any> {
    // TODO handle post/get differently

    const url = `${this.apiRootURL}/${serviceName}/${methodName}.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        'Accept': 'application/json',
        [JSON_PAYLOAD_HEADER]: JSON.stringify(payload),
      }
    });

    const result: GetResponse = await response.json();

    if (result.error) {
      throw result.error;
    }

    return result;
  }

  async invokeServicePost(serviceName, methodName, payload: any): Promise<any> {
    const url = `${this.apiRootURL}/${serviceName}/${methodName}.json`;

    // TODO: piggy back reload requests
    const request: PostRequest = {
      payload,
    };

    const httpResponse = await fetch(url, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(request),
    });

    const response: PostResponse = await httpResponse.json();

    if (response.error) {
      throw response.error;
    }

    // TODO: refresh store with reload data.

    return response.result;
  }
}

class RemoteService implements Service {
  store: Store;
  name: string;
  parent: RemoteServiceManager;

  constructor(parent: RemoteServiceManager, name: string, store: Store) {
    this.store = store;
    this.parent = parent;
    this.name = name;
  }

  // Let service root handle caching...
  // It fetches data and sets the store... or do we let ServiceRoot do that?
  // Probably do it here, so we can use the service without ServiceRoot.
  async get(method: string, payload: any): Promise<any> {
    const response = await this.parent.invokeServiceGet(this.name, method, payload);

    const result = response.result;

    this.store.set(result);

    return result;
  }

  async post(method: string, payload: any): Promise<any> {
    return this.parent.invokeServicePost(this.name, method, payload);
  }
}

