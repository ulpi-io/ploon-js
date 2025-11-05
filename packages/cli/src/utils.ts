/**
 * CLI Utilities
 * File I/O, format detection, etc.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { stdin, stdout } from 'node:process'

/**
 * Read input from file or stdin
 */
export async function readInput(filePath?: string): Promise<string> {
  // If no file path, read from stdin
  if (!filePath || filePath === '-') {
    return readStdin()
  }

  // Read from file
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`)
  }
}

/**
 * Write output to file or stdout
 */
export async function writeOutput(content: string, filePath?: string): Promise<void> {
  // If no file path, write to stdout
  if (!filePath) {
    stdout.write(content + '\n')
    return
  }

  // Write to file
  try {
    await writeFile(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to write file: ${filePath}`)
  }
}

/**
 * Read from stdin
 */
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''

    stdin.setEncoding('utf-8')

    stdin.on('data', (chunk) => {
      data += chunk
    })

    stdin.on('end', () => {
      resolve(data)
    })

    stdin.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Detect input format from file extension or content
 */
export function detectFormat(filePath: string | undefined, content: string): 'json' | 'xml' | 'yaml' | 'ploon' {
  // Detect from file extension
  if (filePath && filePath !== '-') {
    const ext = filePath.split('.').pop()?.toLowerCase()

    if (ext === 'json') return 'json'
    if (ext === 'xml') return 'xml'
    if (ext === 'yaml' || ext === 'yml') return 'yaml'
    if (ext === 'ploon') return 'ploon'
  }

  // Detect from content
  const trimmed = content.trim()

  // Check for PLOON (starts with schema [name#count])
  if (trimmed.match(/^\[[\w]+#\d+\]/)) {
    return 'ploon'
  }

  // Check for JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json'
  }

  // Check for XML
  if (trimmed.startsWith('<')) {
    return 'xml'
  }

  // Check for YAML (has colon without quotes, or starts with -)
  if (trimmed.match(/^[\w-]+:/) || trimmed.startsWith('-')) {
    return 'yaml'
  }

  // Default to JSON
  return 'json'
}
