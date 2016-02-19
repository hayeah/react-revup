import React = require("react");
const ReactDOM = require("react-dom");
const { Router, browserHistory } = require('react-router');

const fetch = require("node-fetch");

import {
  HYDRATION_DATA_NAME,
  REACT_ROOT_ID,
  SERVICE_CURSOR_PATH,

  JSON_PAYLOAD_HEADER,

  Store,
  ServiceManager,
  Service,

  RequestType,

  GetResponse,


  Routes,
} from "./index";
import {createStore} from "./store";

import { ServiceContext } from "./react";

export function mountRoutes(routes: Routes) {
  // const {routes} = props;

  const hydrationData = window[HYDRATION_DATA_NAME] || {};

  const store = createStore(hydrationData);

  const apiURL = `${window.location.protocol}//${window.location.host}/api`;

  const factory = new RemoteServiceManager(store.select(SERVICE_CURSOR_PATH), apiURL);

  function App() {
    return (
      <ServiceContext serviceFactory={factory}>
        <Router routes={routes} history={browserHistory}/>
      </ServiceContext>
    );
  };

  ReactDOM.render(<App/>, document.querySelector(`#${REACT_ROOT_ID}`));
}

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

  async invokeService(type: RequestType, serviceName, methodName, payload: any): Promise<GetResponse> {
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
    const response = await this.parent.invokeService("get", this.name, method, payload);

    const result = response.result;

    this.store.set(result);

    return result;
  }

  post(method: string, payload: any) {
    throw new Error("not yet implemented");
  }
}

