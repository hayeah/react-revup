import React = require("react");

import {
  Service,
  Store,

  ReloadRequest,
  ServiceManager,
  // ServerServices,
  // ServiceManager,
} from "../index";

import {
  ServiceChildContext,
} from "./index";

import {
  RemoteServiceManager,
} from "../client";

interface State {
  service: Service;
  store: Store;
  manager: ServiceManager;
}

interface Props {
  serviceName: string,
  methodName: string,
  // component: JSX.ElementClass,
  component: any,
}

interface RouterProps {
  location?: any,
  params?: any,
}

// context injected by <ServiceContext>
export class ServiceDataProvider extends React.Component<Props & RouterProps, State> {
	  static contextTypes = {
      serviceManager: React.PropTypes.any,
    }

    constructor(props: Props & RouterProps, context: ServiceChildContext) {
      super(props, context);

      const manager = context.serviceManager;
      const service = manager.service(this.props.serviceName);
      const store = service.store.select(this.props.methodName);

      this.state = {
        manager,
        service,
        store,
      };

      // check for undefined... i guess. api should return null if it needs a void value.
      const isLoaded = store.get() !== undefined;

      if(isLoaded) {
        return;
      };

      this.loadData();
    }

    componentDidMount() {
      const { store } = this.state;
      const manager = this.state.manager as RemoteServiceManager;
      this.state.store.on("update", this.onUpdate);
      manager.registerServiceDataProviderForReload(this);
    }

    componentWillUnmount() {
      const { store } = this.state;
      const manager = this.state.manager as RemoteServiceManager;

      this.state.store.off("update", this.onUpdate);
      manager.unregisterServiceDataProviderForReload(this);
      this.clearCache();
    }

    clearCache() {
      this.state.store.unset();
    }

    // If two paths share the same routing component (or if query or parameter changes) we get this lifecycle when transitioning between them.
    componentWillReceiveProps(nextProps) {
      if(nextProps !== this.props) {
        // This is always going to be the case?
        // Maybe add more sophisticated caching policy in the future.
        this.loadData(nextProps);
      }
    }

    onUpdate = () => {
      this.forceUpdate();
    }

    loadData(props = this.props) {
      const {service} = this.state;

      // Injected by React Router
      // https://github.com/reactjs/react-router/blob/latest/docs/API.md#injected-props
      const {location, params} = props;

      const payload = Object.assign({}, location.query, params);

      service.get(this.props.methodName, payload);
    }

    render() {
      const {store} = this.state;
      const isLoaded = store.get() !== undefined;
      const Component = this.props.component;

      if(!isLoaded) {
        return null;
      }

      const props = {
        data: store.get(),
      };

      return <Component {...props} {...this.props}/>;
    }

  }