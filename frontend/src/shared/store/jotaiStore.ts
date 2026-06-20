import { createStore } from 'jotai';

/**
 * Shared Jotai store singleton.
 * Used by action functions (outside React) to imperatively read/write atoms.
 * The same store is passed to <Provider store={jotaiStore}> in app/providers/index.tsx.
 */
export const jotaiStore = createStore();
