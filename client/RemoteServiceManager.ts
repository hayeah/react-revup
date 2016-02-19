const fetch = require("node-fetch");

import {
  JSON_PAYLOAD_HEADER,

  Store,
  ServiceManager,
  Service,

  RequestType,

  GetResponse,

  ReloadRequest,

  PostRequest,
  PostResponse,
} from "../index";

import { ServiceDataProvider } from "../react/ServiceDataProvider";

export class RemoteServiceManager implements ServiceManager {
  store: Store;

  apiRootURL: string;

  private _promises: Promise<any>[] = [];
  private _serviceDataProviders: { [key: string]: ServiceDataProvider } = {};

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

    const reloadRequests = this.buildReloadRequests();
    if(reloadRequests.length > 0) {
      request.reload = reloadRequests;
    }

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

    // TODO probably should do something here?
    if (response.hasReloadError === true) {
      // throw rudely for now...
      throw new Error("TODO: handle reload error");
    }

    if (response.reloadResults) {
      response.reloadResults.forEach(response => {
        const { service, method, result, error } = response;

        const substore = this.store.select([service, method]);

        if(error) {
          substore.merge({ error });
          return;
        }

        substore.set(result);
      });
    }

    // TODO: refresh store with reload data.

    return response.result;
  }

  registerServiceDataProviderForReload(component: ServiceDataProvider) {
    const {serviceName, methodName} = component.props;
    const key = `${serviceName}.${methodName}`;
    this._serviceDataProviders[key] = component;
  }

  unregisterServiceDataProviderForReload(component: ServiceDataProvider) {
    const {serviceName, methodName} = component.props;
    const key = `${serviceName}.${methodName}`;
    delete this._serviceDataProviders[key];
  }

  buildReloadRequests(): ReloadRequest[] {
    return Object.keys(this._serviceDataProviders).map(key => {
      const component = this._serviceDataProviders[key];
      return this.buildReloadRequest(component);
    });
  }

  buildReloadRequest(component: ServiceDataProvider): ReloadRequest {
    const {
      location,
      params,
      serviceName,
      methodName,
    } = component.props;

    const payload = Object.assign({}, location.query, params);

    const request: ReloadRequest = {
      service: serviceName,
      method: methodName,
      payload,
    };

    return request;
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

    const methodStore = this.store.select(method);
    methodStore.set(result);

    return result;
  }

  async post(method: string, payload: any): Promise<any> {
    return this.parent.invokeServicePost(this.name, method, payload);
  }
}

