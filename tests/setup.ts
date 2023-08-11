import { expect, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

beforeEach(() => {
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
});
