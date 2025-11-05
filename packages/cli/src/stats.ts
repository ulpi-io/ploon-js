/**
 * Statistics
 * Token counting and comparison using tiktoken
 */

import { consola } from 'consola'
import { encoding_for_model } from 'tiktoken'
import type { ConvertOptions } from './convert'

/**
 * Count tokens using tiktoken (accurate for GPT models)
 */
function countTokens(text: string): number {
  try {
    // Use cl100k_base encoding (GPT-4, GPT-3.5-turbo, text-embedding-ada-002)
    const encoding = encoding_for_model('gpt-4')
    const tokens = encoding.encode(text)
    const count = tokens.length
    encoding.free() // Clean up
    return count
  } catch (error) {
    // Fallback to simple estimation if tiktoken fails
    consola.warn('Tiktoken failed, using estimation')
    return Math.ceil(text.length / 4)
  }
}

/**
 * Show statistics comparing formats
 */
export function showStats(
  input: string,
  output: string,
  options: ConvertOptions
): void {
  const inputTokens = countTokens(input)
  const outputTokens = countTokens(output)
  const inputChars = input.length
  const outputChars = output.length

  const tokenDiff = inputTokens - outputTokens
  const tokenPercent = inputTokens > 0 ? ((tokenDiff / inputTokens) * 100).toFixed(1) : '0.0'

  const charDiff = inputChars - outputChars
  const charPercent = inputChars > 0 ? ((charDiff / inputChars) * 100).toFixed(1) : '0.0'

  console.log('')
  consola.box({
    title: '📊 Token Statistics (tiktoken/GPT-4)',
    message: [
      `Input:   ${inputTokens} tokens (${inputChars} chars)`,
      `Output:  ${outputTokens} tokens (${outputChars} chars)`,
      '',
      tokenDiff >= 0
        ? `✅ Saved ${tokenDiff} tokens (-${tokenPercent}%)`
        : `⚠️  Added ${Math.abs(tokenDiff)} tokens (+${Math.abs(parseFloat(tokenPercent))}%)`,
      charDiff >= 0
        ? `✅ Saved ${charDiff} chars (-${charPercent}%)`
        : `⚠️  Added ${Math.abs(charDiff)} chars (+${Math.abs(parseFloat(charPercent))}%)`
    ].join('\n'),
    style: {
      padding: 1,
      borderColor: tokenDiff >= 0 ? 'green' : 'yellow',
      borderStyle: 'round'
    }
  })
}
