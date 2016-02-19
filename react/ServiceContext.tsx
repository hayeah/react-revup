import React = require("react");

import {
  ServiceManager,
} from "../index";

import {
  ServiceChildContext,
} from "./index";

interface ServiceContextProps {
  serviceFactory: ServiceManager;
}

export const ServiceContext = React.createClass<ServiceContextProps, void>({
  childContextTypes: {
    serviceFactory: React.PropTypes.any
  },

  getChildContext() {
    const context: ServiceChildContext = {
      serviceFactory: this.props.serviceFactory,
    };

    return context;
  },

  render() {
    return this.props.children;
  }
});

export default ServiceContext;
