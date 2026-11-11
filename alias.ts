import { fileURLToPath } from 'node:url';
const pkgs = ['shared', 'react', 'react-reconciler', 'react-dom-bindings', 'react-dom', 'scheduler'];
export const alias = Object.fromEntries(
  pkgs.map((p) => [`@mini-react/${p}`, fileURLToPath(new URL(`./packages/${p}/src`, import.meta.url))]),
);
