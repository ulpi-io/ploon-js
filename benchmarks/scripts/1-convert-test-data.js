#!/usr/bin/env node
/**
 * Convert PLOON Test Data to JSON/XML/YAML
 * Creates comparison datasets in organized folders
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parse, toJSON, toXML, toYAML } from '../../packages/ploon/dist/index.js'

const PLOON_DIR = join(process.cwd(), 'benchmarks/data/ploon')
const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')

console.log('🔄 Converting PLOON test files to other formats\n')

async function convertAllFiles() {
  // Get all .ploon files
  const files = await readdir(PLOON_DIR)
  const ploonFiles = files.filter(f => f.endsWith('.ploon'))

  console.log(`Found ${ploonFiles.length} PLOON files:\n`)

  let converted = 0
  let skipped = 0

  for (const file of ploonFiles) {
    const testName = basename(file, '.ploon')

    // Skip minified versions - we'll use the standard version
    if (testName.includes('.min')) {
      console.log(`⏭️  Skipping ${file} (minified version)`)
      skipped++
      continue
    }

    console.log(`📦 Processing: ${file}`)

    try {
      // Read PLOON file
      const ploonPath = join(PLOON_DIR, file)
      const ploonContent = await readFile(ploonPath, 'utf-8')

      // Parse to object
      const data = parse(ploonContent)

      // Create output folder
      const outputDir = join(COMPARISON_DIR, testName)
      await mkdir(outputDir, { recursive: true })

      // Convert to all formats
      const jsonContent = toJSON(data, true)  // Pretty JSON
      const xmlContent = toXML(data, true)    // Pretty XML
      const yamlContent = toYAML(data, true)  // Pretty YAML

      // Write all formats
      await writeFile(join(outputDir, 'data.json'), jsonContent, 'utf-8')
      await writeFile(join(outputDir, 'data.xml'), xmlContent, 'utf-8')
      await writeFile(join(outputDir, 'data.yaml'), yamlContent, 'utf-8')
      await writeFile(join(outputDir, 'data.ploon'), ploonContent, 'utf-8')

      console.log(`   ✅ Created ${testName}/ with 4 formats`)
      console.log(`      JSON: ${jsonContent.length} chars`)
      console.log(`      XML:  ${xmlContent.length} chars`)
      console.log(`      YAML: ${yamlContent.length} chars`)
      console.log(`      PLOON: ${ploonContent.length} chars\n`)

      converted++
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message)
      console.log()
    }
  }

  console.log('='.repeat(60))
  console.log(`✅ Conversion complete!`)
  console.log(`   Converted: ${converted}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total files: ${ploonFiles.length}`)
  console.log(`\n📁 Output: ${COMPARISON_DIR}`)
}

// Run conversion
convertAllFiles().catch(console.error)
