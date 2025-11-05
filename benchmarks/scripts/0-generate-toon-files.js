#!/usr/bin/env node
/**
 * Generate TOON Files Using Official TOON Library
 * Ensures fair comparison by using actual TOON output
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encode } from '@toon-format/toon'

const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')

console.log('🔄 Generating TOON files using official @toon-format/toon library\n')

async function generateToonFiles() {
  const folders = await readdir(COMPARISON_DIR)

  let converted = 0
  let failed = 0

  for (const folder of folders) {
    console.log(`📦 ${folder}`)

    try {
      const jsonPath = join(COMPARISON_DIR, folder, 'data.json')
      const toonPath = join(COMPARISON_DIR, folder, 'data.toon')

      // Read JSON file
      const jsonContent = await readFile(jsonPath, 'utf-8')
      const data = JSON.parse(jsonContent)

      // Convert to TOON using official library
      const toonContent = encode(data)

      // Save TOON file
      await writeFile(toonPath, toonContent, 'utf-8')

      console.log(`   ✅ JSON → TOON (${toonContent.length} chars)`)
      converted++

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      failed++
    }

    console.log()
  }

  console.log('='.repeat(60))
  console.log('✅ TOON File Generation Complete!')
  console.log(`   Converted: ${converted}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total folders: ${folders.length}`)
  console.log('\n📁 All TOON files generated using official TOON library')
  console.log('   Files are now ready for accurate benchmarking')
}

generateToonFiles().catch(console.error)
