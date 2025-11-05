#!/usr/bin/env node
/**
 * Generate PLOON files from JSON using stringify()
 * Ensures PLOON files are created with the actual encoder
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stringify, minify } from '../../packages/ploon/dist/index.js'

const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')

console.log('🔧 Generating PLOON files from JSON\n')

async function generatePloonFiles() {
  const folders = await readdir(COMPARISON_DIR)

  for (const folder of folders) {
    const jsonPath = join(COMPARISON_DIR, folder, 'data.json')
    const ploonPath = join(COMPARISON_DIR, folder, 'data.ploon')
    const ploonMinPath = join(COMPARISON_DIR, folder, 'data.min.ploon')

    console.log(`📦 ${folder}`)

    try {
      // Read JSON
      const jsonContent = await readFile(jsonPath, 'utf-8')
      const data = JSON.parse(jsonContent)

      // Convert to PLOON using stringify
      const ploonContent = stringify(data)

      // Create minified version
      const ploonMinContent = minify(ploonContent)

      // Write PLOON files
      await writeFile(ploonPath, ploonContent, 'utf-8')
      await writeFile(ploonMinPath, ploonMinContent, 'utf-8')

      console.log(`   ✅ Generated data.ploon (${ploonContent.length} chars)`)
      console.log(`   ✅ Generated data.min.ploon (${ploonMinContent.length} chars)\n`)

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }

  console.log('✅ All PLOON files generated!\n')
}

generatePloonFiles().catch(console.error)
