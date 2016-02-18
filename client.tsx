import React = require("react");
const ReactDOM = require("react-dom");

const { Router, browserHistory } = require('react-router');

import {
  HYDRATION_DATA_NAME,
  REACT_ROOT_ID,
  SERVICE_CURSOR_PATH,

  Store,
  ServiceFactory,
  Service,


  Routes,
} from "./index";
import {createStore} from "./store";

import { ServiceContext } from "./react";

export function mountRoutes(routes: Routes) {
  // const {routes} = props;

  const hydrationData = window[HYDRATION_DATA_NAME] || {};

  const store = createStore(hydrationData);

  const factory = new RemoteServiceFactory(null, store.select(SERVICE_CURSOR_PATH));

  function App() {
    return (
      <ServiceContext serviceFactory={factory}>
        <Router routes={routes} history={browserHistory}/>
      </ServiceContext>
    );
  };

  ReactDOM.render(<App/>, document.querySelector(`#${REACT_ROOT_ID}`));
}

export class RemoteServiceFactory implements ServiceFactory {
  store: Store;

  private _promises: Promise<any>[] = [];

  constructor(url: string, store: Store) {
    this.store = store;
  }

  service(name: string): Service {
    const substore = this.store.select(name);
    return new RemoteService(substore);
  }
}

class RemoteService implements Service {
  store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  // Register get promises with backend.
  get(method: string, payload: any): Promise<any> {
    return this.store.get();
  }

  post(method: string, payload: any) {
    throw new Error("not yet implemented");
  }
}
