import React = require("react");

import {
  Service,
  Store,
  ServerServices,
  ServiceManager,
} from "../index";

import {
  ServiceChildContext,
} from "./index";

interface ServiceRootState {
  service: Service;
  store: Store;
}

import { ServiceDataProvider } from "./ServiceDataProvider";

export function ServiceRoot(Component: any, serviceName: string, methodName: string) {

  return (routerProps) => {
    return <ServiceDataProvider component={Component} serviceName={serviceName} methodName={methodName} {...routerProps}/>
  };
}

export default ServiceRoot;