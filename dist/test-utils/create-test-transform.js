import { applyTransform } from 'jscodeshift/src/testUtils';
/**
 * Simple factory function to hide the all the applyTransform() configuration with default empty options
 * and set the parser to 'ts' for TypeScript
 */
export function createTestTransform(transformer) {
    const testOptions = { parser: 'ts' };
    return (input, options) => {
        // Create a new options object for each call, passing it directly to the transformer
        return applyTransform(transformer, options || {}, input, testOptions);
    };
}
