import React = require("react");
const ReactDOM = require("react-dom/server");

const createLocation = require('history/lib/createLocation');
const { Router, RouterContext, match, createMemoryHistory } = require('react-router');

import { DirectServiceManager } from "./DirectServiceManager";
import { createStore } from "../store";
import { ServiceContext } from "../react";

import {
  ServerServices,
  HYDRATION_DATA_NAME,
  REACT_ROOT_ID,
  SERVICE_CURSOR_PATH,
  Routes,
} from "../index";

interface MiddlewareConfig {
}

export function makeMiddleware(
  routes: any,
  services: ServerServices,
  StaticHTMLWrapper: React.ComponentClass<any> | React.StatelessComponent<any>,
  config?: MiddlewareConfig
) {

  async function handleRoute(req, res, routerProps): Promise<void> {
    const store = createStore();

    const factory = new DirectServiceManager(services, store.select(SERVICE_CURSOR_PATH), {
      req,
    });
    // const service;

    const App = () => {
      return (
        <ServiceContext serviceFactory={factory}>
          <RouterContext {...routerProps}>
            <Router routes={routes} history={history}/>
          </RouterContext>
        </ServiceContext>
      );
    };

    // Q: Does construction happen without rendering?
    // A: doesn't look like it's happening.
    // const app = <App/>;

    // res.end(JSON.stringify({redirectLocation, renderProps}, null, 2));

    /*
      LOLZ Two rendering passes.
    */
    // First rendering pass
    // TODO make Layout a no-op if data isn't loaded yet
    let output: string = ReactDOM.renderToString(<App/>);


    if (factory.hasPendingLoadRequests) {
      // Second rendering pass, with loaded data
      console.log("throw away first pass", output);
      await factory.waitLoadRequests();
      output = ReactDOM.renderToString(<App/>);
    }

    const hydrationData = store.get();

    // cast to any to supress typescript error...
    const StaticHTMLWrapper_: any = StaticHTMLWrapper;

    const viewWithStaticWrapper = (
      <StaticHTMLWrapper_ {...routerProps}>
        <div id={REACT_ROOT_ID} dangerouslySetInnerHTML={{ __html: output }}/>
        {hydrationData && <InjectHydrationData data={hydrationData}/>}
      </StaticHTMLWrapper_>
    );

    res.write("<!doctype html>\n");
    res.write(ReactDOM.renderToStaticMarkup(viewWithStaticWrapper));
    res.end();

    return;
  }

  function matchRoute(req, res, next) {
    const history = createMemoryHistory();
    const location = createLocation(req.url);

    // Ignore requests that looks like JSON.
    // In particular, we want `Accept: */*` to not match if we are curling the API.
    if (req.path.match(/\.json$/) || req.headers.accept.match("json")) {
      next();
      return;
    }

    match({ routes, location }, (error, redirectLocation, renderProps) => {
      if (error) {
        next(error);
        return;
      }

      if (redirectLocation) {
        res.redirect(302, redirectLocation.pathname + redirectLocation.search);
        return;
      }

      handleRoute(req, res, renderProps).catch(next);
    });
  }
  return matchRoute;
}

function InjectHydrationData(props) {
  const {data} = props;
  const setWindowData = `window.${HYDRATION_DATA_NAME} = ${JSON.stringify(data)};`
  const hydrationDataInjection = {
    __html: `\n//<![CDATA[\n${setWindowData}\n//]]>\n`
  };
  return <script type="text/javascript" dangerouslySetInnerHTML={hydrationDataInjection}/>;
}

