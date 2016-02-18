import React = require("react");
const ReactDOM = require("react-dom/server");

const createLocation = require('history/lib/createLocation');
const { Router, RouterContext, match, createMemoryHistory } = require('react-router');

import { DirectServiceFactory } from "./DirectServiceFactory";
import { createStore } from "../store";
import { ServerServices, HYDRATION_DATA_NAME } from "../index";
import { ServiceContext } from "../react";

interface MiddlewareConfig {
  routes: any;
  services: ServerServices;
  scripts: string[];
}

export function makeMiddleware(config: MiddlewareConfig) {
  const { routes, services, scripts } = config;

  async function matchRoute(req, res, next) {
    const history = createMemoryHistory();
    const location = createLocation(req.url);

    // Ignore requests that looks like JSON.
    // In particular, we want `Accept: */*` to not match if we are curling the API.
    if(req.url.match(/\.json$/) || req.headers.accept.match("json")) {
      next();
      return;
    }

    match({ routes, location }, async (error, redirectLocation, renderProps) => {
      // TODO try/catch
      if (error) {
        next(error);
        return;
      }

      if (redirectLocation) {
        res.redirect(302, redirectLocation.pathname + redirectLocation.search);
        return;
      }

      // FIXME remove after experiment
      // let loadPromises: Promise<any>[] = [];
      // global.loadPromises = loadPromises;

      const store = createStore();

      const factory = new DirectServiceFactory(services, store.select("services"), {
        req,
      });
      // const service;

      const App = () => {
        return (
          <ServiceContext serviceFactory={factory}>
            <RouterContext {...renderProps}>
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


      if(factory.hasPendingLoadRequests) {
        // Second rendering pass, with loaded data
        console.log("throw away first pass", output);
        await factory.waitLoadRequests();
        output = ReactDOM.renderToString(<App hydrationData={store.get()}/>);
      }

      const pageWithLayout = <HTML5BoilerPlate content={output} hydrationData={store.get()} scripts={scripts}/>;


	    res.write("<!doctype html>");
      res.write(ReactDOM.renderToStaticMarkup(pageWithLayout))

      res.end();
    });
  }

	return async (req, res, next) => {
    matchRoute(req, res, next).catch(next);
  };
}

function Hydration(props) {
  const {data} = props;
  const hydrationDataInjection = {
    __html: `// <![CDATA[\n console.log("hydrate client store");window.${HYDRATION_DATA_NAME} = ${JSON.stringify(data)} \n // ]]>`
  }
  return <script type="text/javascript" dangerouslySetInnerHTML={hydrationDataInjection}/>
}

function HTML5BoilerPlate(props) {
  const {content, hydrationData, scripts} = props;

	const scriptTags = scripts.map((script, i) => {
    return <script key={i} type="text/javascript" src={script}/>
  });

  return (
    <html>
       <head>
          <meta httpEquiv="x-ua-compatible" content="ie=edge"/>
          <title>Hi!</title>
          <meta name="description" content=""/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </head>

      <body>
        <div id="react-root" dangerouslySetInnerHTML={{__html: content}}/>

        {hydrationData && <Hydration data={hydrationData}/>}
        {scriptTags}
      </body>
    </html>
  )
}