import express = require("express");
const Baobab = require("baobab");

export const REACT_ROOT_ID = "react-root";
export const JSON_PAYLOAD_HEADER = 'x-json-payload';
export const HYDRATION_DATA_NAME = "__REVUP_HYDRATION_DATA__";

// @param context For injections.
type GetHandler<T> = (payload?: any, context?: T) => Promise<any>;
type PostHandler<T> = (payload?: any, context?: T) => Promise<void>;

export interface ServerService<T> {
  name: string,

  context?: (context: RequestContext) => Promise<T>;

  // GET
  get: { [key: string]: GetHandler<T> };

  // POST
  post?: { [key: string]: PostHandler<T> };
}

export type ServerServices = { [key: string]: ServerService<any> };

export interface GetRequest {
  name: string,
  payload: string,
}

export interface GetResponse {
  service: string,
  path: string,
  data?: any,
  error?: any,
}

// POST action
export interface PostRequest {
  name: string,
  payload: any,
  reload?: GetRequest,
}

export interface PostResponse {
  data?: any,
  error?: any,
}

export interface RequestContext {
  req: express.Request;
}

export interface Cursor<T> {
  get(): T;
  set(data: T);
  select(key: string): Cursor<any>;
  select(keyPath: string[]): Cursor<any>;

  // F-bounded polymorphism works for functions but not methods.
  // https://github.com/Microsoft/TypeScript/issues/4889#issuecomment-178819795
  // https://github.com/Microsoft/TypeScript/pull/5949
  // merge<T extends U, U>(val: U)
  merge(obj: Object)
}

// Application code can specialize this type.
export interface Service {
  get(method: string, payload?: any);
  post(method: string, payload?: any);

  store: Cursor<any>;
}

// A Backend is a service factory
export interface ServiceFactory {
  service(name: string): Service;
}

export type Store = Cursor<any>;

