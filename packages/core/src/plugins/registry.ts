import type { KeyloomPlugin, RegisteredPlugin } from "./types";

const _plugins: RegisteredPlugin[] = [];

export function registerPlugin(p: KeyloomPlugin<any>, options?: any) {
  const routes = p.nextRoutes ? p.nextRoutes(options) : [];
  _plugins.push({ name: p.name, routes });
}

export function listPlugins(): RegisteredPlugin[] {
  return [..._plugins];
}

export function clearPlugins() {
  _plugins.length = 0;
}

