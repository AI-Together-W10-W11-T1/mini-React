import { defineConfig } from 'vite';
import { alias } from './alias.ts';
// fixtures/를 루트로 띄운다 → /phase1-vdom-playground/, /phase2-app/
export default defineConfig({ root: 'fixtures', resolve: { alias } });
