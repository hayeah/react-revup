import {
  ServerServices,
  RequestContext,
} from "../index";

export default async function invokeService<Context>(
  type: "get" | "post",
  baseContext: RequestContext,
  services: ServerServices,
  serviceName: string,
  methodName: string,
  payload
): Promise<any> {

  const service = services[serviceName];
  const req = baseContext.req;

  if (service === undefined) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  // build context
  let context: Context;
  if (service.context) {
    context = await service.context(baseContext);
  }

  let handler;
  if(type === "get") {
    handler = service.get[methodName];
  } else {
    handler = service.post[methodName];
  }

  if (handler == null) {
    throw new Error(`Unknown service method: ${req.method} ${serviceName}.${methodName}`);
  }

  return handler(payload, context);
}