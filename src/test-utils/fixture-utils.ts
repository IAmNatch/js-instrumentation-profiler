import { readFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Reads a static fixture file from the __fixtures__/static directory
 * @param filename The name of the fixture file to read
 * @param testFilePath The path to the test file (used to locate the __fixtures__ directory)
 * @returns The contents of the fixture file
 */
export const readFixture = (filename: string, testFilePath: string) => {
  const __dirname = dirname(testFilePath);
  return readFileSync(join(__dirname, '__fixtures__', 'static', filename), 'utf8');
};

/**
 * Reads a dynamic fixture file from the __fixtures__/dynamic directory and replaces placeholders with provided values
 * @param filename The name of the fixture file to read
 * @param replacements A map of placeholder names to their replacement values
 * @param testFilePath The path to the test file (used to locate the __fixtures__ directory)
 * @returns The contents of the fixture file with placeholders replaced
 */
export const readDynamicFixture = (
  filename: string, 
  replacements: Record<string, string>,
  testFilePath: string
) => {
  const __dirname = dirname(testFilePath);
  let content = readFileSync(join(__dirname, '__fixtures__', 'dynamic', filename), 'utf8');
  
  // Validate that each placeholder has at least one match in the content
  for (const [key, value] of Object.entries(replacements)) {
    const placeholderRegex = new RegExp(`//\\s*@INJECT:\\s*${key}`, 'g');
    const matches = content.match(placeholderRegex);
    
    if (!matches || matches.length === 0) {
      throw new Error(`No matches found for placeholder "// @INJECT: ${key}" in fixture file "${filename}". Check that the placeholder exists in the file and is correctly formatted.`);
    }
  }
  
  // Perform replacements
  for (const [key, value] of Object.entries(replacements)) {
    // Replace comment-based placeholders (// @INJECT: KEY)
    content = content.replace(new RegExp(`//\\s*@INJECT:\\s*${key}`, 'g'), value);
  }
  return content;
}; 