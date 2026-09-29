export * from './data';

// `mockDelay` is re-exported from its own module rather than defined here, so
// that importing the delay alone does not drag the entire mock dataset into a
// consumer's bundle. `client.ts` imports the module directly for that reason.
export { mockDelay } from './delay';
