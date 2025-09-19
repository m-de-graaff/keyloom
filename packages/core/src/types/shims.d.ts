// Local shims used only for declaration emit to avoid optional runtime deps breaking typegen
// These modules are optional at runtime and not required for type information here.
declare module '@node-rs/argon2' {
  const anyExport: any;
  export = anyExport;
}

declare module 'bcryptjs' {
  const anyExport: any;
  export = anyExport;
}

