import React = require("react");

import {
  ServiceManager,
} from "../index";

import {
  ServiceChildContext,
} from "./index";

interface ServiceContextProps {
  serviceManager: ServiceManager;
}

export const ServiceContext = React.createClass<ServiceContextProps, void>({
  childContextTypes: {
    serviceManager: React.PropTypes.any
  },

  getChildContext() {
    const context: ServiceChildContext = {
      serviceManager: this.props.serviceManager,
    };

    return context;
  },

  render() {
    return this.props.children;
  }
});

export default ServiceContext;
