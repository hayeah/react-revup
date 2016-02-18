import React = require("react");

import {
  Service,
  Store,
  ServerServices,
  ServiceFactory,
} from "./index";

const Types = (React.PropTypes as any);

interface ServiceChildContext {
  serviceFactory: ServiceFactory;
}

interface ServiceContextProps {
  serviceFactory: ServiceFactory;
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

// class ServiceContext extends React.Component<any,any> {
//   childContextTypes: {
//     service: Types.string,
//   }
// }

// class ServiceRoot extends React.Component<any,any> {

// }

// interface RouterProps {
//   children: any,
// }

interface ServiceRootState {
  service: Service;
  store: Store;
}

// TODO: configurable loading indicator
export function ServiceRoot(Component: any, serviceName: string, getMethod: string) {

  // get context injected by ServiceContext
  class ServiceDataComponent extends React.Component<any, ServiceRootState> {
	  static contextTypes = {
      serviceFactory: React.PropTypes.any,
    }

    constructor(props, context: ServiceChildContext) {
      super(props, context);

      const factory = context.serviceFactory;
      const service = factory.service(serviceName);
      const store = service.store;

      // check for undefined... i guess. api should return null if it needs a void value.
      const isLoaded = store.get() !== undefined;

      this.state = {
        service,
        store: service.store,
      };

      if(isLoaded) {
        return;
      };

      this.loadData();
    }

    componentDidMount() {
      this.state.store.on("update", this.onUpdate);
    }

    componentWillUnmount() {
      this.state.store.off("update", this.onUpdate);
      this.clearCache();
    }

    clearCache() {
      this.state.store.unset();
    }

    // If two paths share the same routing component (or if query or parameter changes) we get this lifecycle when transitioning between them.
    componentWillReceiveProps(nextProps) {
      if(nextProps !== this.props) {
        // I think this is always going to be the case?
        // Maybe add more sophisticated caching policy in the future.
        this.loadData(nextProps);
      }
    }

    onUpdate = () => {
      this.forceUpdate();
    }

    loadData(props = this.props) {
      const {service} = this.state;

      // These are injected by the Router
      // https://github.com/reactjs/react-router/blob/latest/docs/API.md#injected-props
      const {location, params} = props;

      const payload = Object.assign({}, location.query, params);

      service.get(getMethod, payload);
    }

    render() {
      const {store} = this.state;
      const isLoaded = store.get() !== undefined;

      if(!isLoaded) {
        return null;
      }

      const props = {
        data: store.get(),
      };

      return <Component {...props} {...this.props}/>;
    }

  }

  return ServiceDataComponent;
}