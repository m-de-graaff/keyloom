export type PluginContext = {
  /** Arbitrary shared state bag for plugins */
  shared?: Record<string, unknown>;
};

export type RouteMatchExt = { kind: string; params?: Record<string, string> };

export type NextRoute = {
  /** HTTP method */
  method: "GET" | "POST";
  /** Full matcher regex against pathname */
  path: RegExp;
  /** Logical kind for introspection*/
  kind: string;
  /** Handler receives Request-like and returns a Response */
  handler: (req: unknown, ctx: { config: unknown; adapter: unknown }) => Promise<unknown> | unknown;
};

export type KeyloomPlugin<Options = unknown> = {
  name: string;
  /** Called once on registration (server) */
  setup?: (ctx: PluginContext, options?: Options) => void | Promise<void>;
  /** Extend Next.js API handler: add custom routes */
  nextRoutes?: (options?: Options) => NextRoute[];
};

export type RegisteredPlugin = { name: string; routes: NextRoute[] };

