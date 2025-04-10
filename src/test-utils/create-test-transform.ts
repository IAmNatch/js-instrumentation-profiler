import { type Transform, type Options } from 'jscodeshift';
import { applyTransform, type TestOptions } from 'jscodeshift/src/testUtils';

/**
 * Simple factory function to hide the all the applyTransform() configuration with default empty options
 * and set the parser to 'ts' for TypeScript
 */
export function createTestTransform(transformer: Transform) {
  const testOptions: TestOptions = { parser: 'ts' };
  return (input: { path?: string; source: string; }, options?: { isPerformanceTest?: boolean }) => {
    // Create a new options object for each call, passing it directly to the transformer
    return applyTransform(transformer, options || {}, input, testOptions);
  };
}