export type { AnyPrismaClient } from "./prisma/index";
export { PrismaAdapter, prismaAdapter } from "./prisma/index";

// Testing utilities for custom adapters
export * as testing from "./testing/contract";
