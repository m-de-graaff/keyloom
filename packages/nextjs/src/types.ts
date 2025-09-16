import type { KeyloomConfig, Adapter } from '@keyloom/core';

export type NextKeyloomConfig = KeyloomConfig & {
  // Expand later with next-specific flags if needed
};

export type RuntimeCtx = {
  config: NextKeyloomConfig;
  adapter: Adapter; // created from config.adapter factory if needed
};