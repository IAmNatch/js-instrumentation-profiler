/** @type {import('jest').Config} */
export default {
    automock: false,
    transform: {
      "\\.ts$": ['ts-jest', { isolatedModules: true }],
    },
  };