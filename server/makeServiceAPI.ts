// import {forOwn} from "lodash";
import express = require("express");
import * as path from "path";

import {
  ServerService,
  GetResponse,
  PostRequest,
  PostResponse,

  ServerServices,

  JSON_PAYLOAD_HEADER,
} from "../index";

// TODO root should output a list of available services. dev-mode

export function makeServiceAPI(services: ServerServices) {
  const router = express.Router();

  router.get("/_describe.json", (req, res, next) => {
	   res.json(describeAPI(services));
  });

  router.get("/:service/:method.json", (req, res, next) => {
    getHandler(req, res, next).catch(err => {
      handleError(err, req, res);
    });
  });

  router.post("/:service/:method.json", (req, res, next) => {
    postHandler(req, res, next).catch(err => {
      handleError(err, req, res);
    });
  });

  return router;

  function handleError(error, req, res) {
    res.json({error});
  }

  async function getHandler(req, res, next) {
    // TODO handle query. should it be payload or context? probably payload -.-
    const service = services[req.params.service];

    if(service === undefined) {
      next();
      return;
    }

    const payload = {};
    const result = await invoke(req, res, service, req.params.method, payload);

    const response: GetResponse = {
      result,
    };

    res.json(response);
  }

  async function postHandler(req, res, next) {
    const service = services[req.params.service];

    if(service === undefined) {
      next();
      return;
    }

    throw "to implement"

    // payload is JSON body.
  }

  // GET name/method.json?a=1&b=2

  // POST name/method
}


async function invoke<Context>(
  req: any,
  res: any,
  service: ServerService<Context>,
  method: string,
  payload) {
  // build context
  let context: Context;
  if (service.context) {
    context = await service.context({req});
  }

  const handler = service.get[method];
  if (handler == null) {
    throw new Error(`Unknown service. ${req.method} ${service.name}.${method}`)
  }

  return handler(payload, context);
}

function describeAPI(services: ServerServices) {
  const descriptions = {};

  Object.keys(services).forEach(key => {
    const service = services[key];

    descriptions[key] = {
      name: key,
      get: Object.keys(service.get),
      post: Object.keys(service.post),
    };
  });

  return descriptions;
}