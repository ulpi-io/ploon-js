/**
 * PLOON Prettify
 * Convert Compact format (semicolon-separated) to Standard format (newline-separated)
 */

/**
 * Prettify PLOON string (Compact → Standard)
 * Replaces semicolons with newlines for readability
 */
export function prettify(ploonString: string): string {
  // Replace semicolons with newlines
  // Add extra newline after schema
  const parts = ploonString.split(';')

  if (parts.length < 2) {
    return ploonString
  }

  // First part is schema, rest are records
  const [schema, ...records] = parts

  return `${schema}\n\n${records.join('\n')}`
}
