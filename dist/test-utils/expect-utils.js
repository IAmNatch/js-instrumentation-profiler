import { expect } from "vitest";
export const expectDurationWithVariance = (actual, expected, varianceMs = 5) => {
    expect(actual).toBeGreaterThanOrEqual(expected - varianceMs);
    expect(actual).toBeLessThanOrEqual(expected + varianceMs);
};
