import express = require("express");
const Baobab = require("baobab");

export const REACT_ROOT_ID = "react-root";
export const JSON_PAYLOAD_HEADER = 'x-json-payload';
export const HYDRATION_DATA_NAME = "__REVUP_HYDRATION_DATA__";
export const SERVICE_CURSOR_PATH = "services";

// @param context For injections.
type GetHandler<T> = (payload?: any, context?: T) => Promise<any>;
type PostHandler<T> = (payload?: any, context?: T) => Promise<any>;

export interface ServerService<T> {
  context?: (context: RequestContext) => Promise<T>;

  // GET
  get: { [key: string]: GetHandler<T> };

  // POST
  post?: { [key: string]: PostHandler<T> };
}

export type ServerServices = { [key: string]: ServerService<any> };

export interface GetRequest {
  payload?: string,
}

export interface GetResponse {
  // service: string,
  // path: string,
  result?: any,
  error?: any,
}

// POST action
export interface PostRequest {
  payload: any,
  reload?: ReloadRequest[],
}

export interface PostResponse {
  result?: any,
  reloadResults?: ReloadResponse[],
  hasReloadError?: boolean,
  // hasReloadError?: boolean,
  error?: any,
}

export interface ReloadRequest {
  service: string,
  method: string,
  payload: any,
};

export interface ReloadResponse {
  service: string,
  method: string,
  result?: any,
  error?: any,
};


export interface RequestContext {
  req: express.Request;
}

export interface Cursor<T> {
  unset(): void;
  get(): T;
  get(path: string): any;
  get(paths: string[]): any;
  set(data: T);
  set(path: string, data: any);
  set(paths: string[], data: any);
  select(key: string): Cursor<any>;
  select(keyPath: string[]): Cursor<any>;

  // F-bounded polymorphism works for functions but not methods.
  // https://github.com/Microsoft/TypeScript/issues/4889#issuecomment-178819795
  // https://github.com/Microsoft/TypeScript/pull/5949
  // merge<T extends U, U>(val: U)
  merge(obj: Object);

  on(event: string, fn: Function);
  off(event: string, fn: Function);
}

// Application code can specialize this type.
export interface Service {
  get(method: string, payload?: any);
  post(method: string, payload?: any);

  store: Cursor<any>;
}

export interface ServiceManager {
  service(name: string): Service;
}

export type Store = Cursor<any>;

export type Routes = any;

export type RequestType = "get" | "post";
