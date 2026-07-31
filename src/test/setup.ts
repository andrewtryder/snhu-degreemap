import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for React Flow in JSDOM tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
