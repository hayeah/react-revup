import { Store } from "./index";

const Baobab = require("baobab");

export function createStore(data: any = {}): Store {
  return new Baobab(data);
}