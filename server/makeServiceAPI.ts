// import {forOwn} from "lodash";
import express = require("express");
import * as path from "path";

import {
  ServerService,
  GetResponse,
  PostRequest,
  PostResponse,

  ServerServices,
  RequestContext,

  ReloadResponse,

  JSON_PAYLOAD_HEADER,
} from "../index";

import invokeService from "./invokeService";

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

  function handleError(error: Error, req, res) {
    const stack = error.stack;
    res.json({
      error: error.toString(),
      stack: stack && stack.split("\n"),
    });
  }

  async function getHandler(req, res, next) {
    // Merge everything together into a payload??
    const payload = Object.assign({}, req.query);

    const rawJSONPayload = req.headers[JSON_PAYLOAD_HEADER];
    if (rawJSONPayload) {
      // FIXME: what if payload is a primitive type?
      const headerPayload = JSON.parse(rawJSONPayload);
      Object.assign(payload, headerPayload);
    }

    const result = await invokeService("get", {req}, services, <string> req.params.service, <string> req.params.method, payload);

    const response: GetResponse = {
      result,
    };

    res.json(response);
  }

  async function postHandler(req, res, next) {
    const request: PostRequest = req.body;

    const result = await invokeService("post", {req}, services, <string> req.params.service, <string> req.params.method, request.payload);

    const response: PostResponse = {
      result,
    };

    // Make reload requests
    if(request.reload) {
      let hasReloadError = false;
      const reloadPromises = request.reload.map(async (request): Promise<ReloadResponse> => {
        const { service, method, payload } = request;
        try {
          const result = await invokeService("get", {req}, services, service, method, payload);

          return {
            service,
            method,
            result,
          };
        } catch (error) {
          hasReloadError = true;
          return {
            service,
            method,
            error,
          };
        }
      });

      const reloadResponses = await Promise.all(reloadPromises);

      response.reloadResults = reloadResponses;
      response.hasReloadError = hasReloadError;
    }

    res.json(response);
  }

  // GET name/method.json?a=1&b=2

  // POST name/method
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