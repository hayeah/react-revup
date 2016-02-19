import React = require("react");
const ReactDOM = require("react-dom");
const { Router, browserHistory } = require('react-router');

import { createStore } from "../store";
import { RemoteServiceManager } from "./RemoteServiceManager";
import { ServiceContext } from "../react";

import {
  HYDRATION_DATA_NAME,
  REACT_ROOT_ID,
  SERVICE_CURSOR_PATH,

  Routes,

  ServiceManager,
} from "../index";

export function mountRoutes(routes: Routes): ServiceManager {
  const hydrationData = window[HYDRATION_DATA_NAME] || {};

  const store = createStore(hydrationData);

  const apiURL = `${window.location.protocol}//${window.location.host}/api`;

  const manager = new RemoteServiceManager(store.select(SERVICE_CURSOR_PATH), apiURL);

  function App() {
    return (
      <ServiceContext serviceManager={manager}>
        <Router routes={routes} history={browserHistory}/>
      </ServiceContext>
    );
  };

  ReactDOM.render(<App/>, document.querySelector(`#${REACT_ROOT_ID}`));

  return manager;
}
