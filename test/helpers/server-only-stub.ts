// Stub for `server-only` package in Vitest test environment.
// The real package throws when imported outside Next.js server context;
// in tests we just want a no-op so repo modules can be imported directly.
const serverOnlyStub = {};
export default serverOnlyStub;
