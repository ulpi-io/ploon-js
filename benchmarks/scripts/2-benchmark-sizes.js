#!/usr/bin/env node
/**
 * Benchmark File Sizes
 * Compare character and byte counts across formats
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')
const RESULTS_DIR = join(process.cwd(), 'benchmarks/results')

console.log('📊 Benchmarking File Sizes\n')

async function benchmarkSizes() {
  // Get all test case folders
  const testCases = await readdir(COMPARISON_DIR)

  const results = {
    timestamp: new Date().toISOString(),
    testCases: {},
    summary: {}
  }

  const formats = ['json', 'xml', 'yaml', 'toon', 'ploon', 'min.ploon']
  let totalSavings = {
    ploon: { json: 0, xml: 0, yaml: 0, toon: 0 },
    ploonMin: { json: 0, xml: 0, yaml: 0, toon: 0 }
  }
  let testCount = 0

  for (const testCase of testCases) {
    console.log(`📦 ${testCase}`)

    const testDir = join(COMPARISON_DIR, testCase)
    const sizes = {}

    // Measure each format
    for (const format of formats) {
      const filePath = join(testDir, `data.${format}`)
      try {
        const content = await readFile(filePath, 'utf-8')
        const buffer = Buffer.from(content, 'utf-8')

        sizes[format] = {
          chars: content.length,
          bytes: buffer.length
        }
      } catch (err) {
        console.error(`   ❌ Missing ${format} file`)
        sizes[format] = { chars: 0, bytes: 0 }
      }
    }

    // Calculate savings vs each format (with PLOON and PLOON-min as baselines)
    const jsonChars = sizes.json.chars
    const xmlChars = sizes.xml.chars
    const yamlChars = sizes.yaml.chars
    const toonChars = sizes.toon.chars
    const ploonChars = sizes.ploon.chars
    const ploonMinChars = sizes['min.ploon'].chars

    const savings = {
      ploon_vs_json: jsonChars > 0 ? ((jsonChars - ploonChars) / jsonChars * 100).toFixed(1) + '%' : '0%',
      ploon_vs_xml: xmlChars > 0 ? ((xmlChars - ploonChars) / xmlChars * 100).toFixed(1) + '%' : '0%',
      ploon_vs_yaml: yamlChars > 0 ? ((yamlChars - ploonChars) / yamlChars * 100).toFixed(1) + '%' : '0%',
      ploon_vs_toon: toonChars > 0 ? ((toonChars - ploonChars) / toonChars * 100).toFixed(1) + '%' : '0%',
      ploon_min_vs_json: jsonChars > 0 ? ((jsonChars - ploonMinChars) / jsonChars * 100).toFixed(1) + '%' : '0%',
      ploon_min_vs_xml: xmlChars > 0 ? ((xmlChars - ploonMinChars) / xmlChars * 100).toFixed(1) + '%' : '0%',
      ploon_min_vs_yaml: yamlChars > 0 ? ((yamlChars - ploonMinChars) / yamlChars * 100).toFixed(1) + '%' : '0%',
      ploon_min_vs_toon: toonChars > 0 ? ((toonChars - ploonMinChars) / toonChars * 100).toFixed(1) + '%' : '0%'
    }

    // Accumulate for average
    if (jsonChars > 0) {
      totalSavings.ploon.json += (jsonChars - ploonChars) / jsonChars * 100
      totalSavings.ploon.xml += (xmlChars - ploonChars) / xmlChars * 100
      totalSavings.ploon.yaml += (yamlChars - ploonChars) / yamlChars * 100
      totalSavings.ploon.toon += (toonChars - ploonChars) / toonChars * 100

      totalSavings.ploonMin.json += (jsonChars - ploonMinChars) / jsonChars * 100
      totalSavings.ploonMin.xml += (xmlChars - ploonMinChars) / xmlChars * 100
      totalSavings.ploonMin.yaml += (yamlChars - ploonMinChars) / yamlChars * 100
      totalSavings.ploonMin.toon += (toonChars - ploonMinChars) / toonChars * 100

      testCount++
    }

    results.testCases[testCase] = { sizes, savings }

    console.log(`   JSON:        ${sizes.json.chars} chars, ${sizes.json.bytes} bytes`)
    console.log(`   XML:         ${sizes.xml.chars} chars, ${sizes.xml.bytes} bytes`)
    console.log(`   YAML:        ${sizes.yaml.chars} chars, ${sizes.yaml.bytes} bytes`)
    console.log(`   TOON:        ${sizes.toon.chars} chars, ${sizes.toon.bytes} bytes`)
    console.log(`   PLOON:       ${sizes.ploon.chars} chars, ${sizes.ploon.bytes} bytes`)
    console.log(`   PLOON (min): ${sizes['min.ploon'].chars} chars, ${sizes['min.ploon'].bytes} bytes`)
    console.log(`   💰 Savings: ${savings.ploon_vs_json} vs JSON, ${savings.ploon_vs_toon} vs TOON\n`)
  }

  // Calculate averages
  if (testCount > 0) {
    results.summary = {
      ploon: {
        average_vs_json: (totalSavings.ploon.json / testCount).toFixed(1) + '%',
        average_vs_xml: (totalSavings.ploon.xml / testCount).toFixed(1) + '%',
        average_vs_yaml: (totalSavings.ploon.yaml / testCount).toFixed(1) + '%',
        average_vs_toon: (totalSavings.ploon.toon / testCount).toFixed(1) + '%'
      },
      ploon_minified: {
        average_vs_json: (totalSavings.ploonMin.json / testCount).toFixed(1) + '%',
        average_vs_xml: (totalSavings.ploonMin.xml / testCount).toFixed(1) + '%',
        average_vs_yaml: (totalSavings.ploonMin.yaml / testCount).toFixed(1) + '%',
        average_vs_toon: (totalSavings.ploonMin.toon / testCount).toFixed(1) + '%'
      },
      test_count: testCount
    }
  }

  // Create dated results folder
  const date = new Date().toISOString().split('T')[0]
  const dateDir = join(RESULTS_DIR, date)
  await mkdir(dateDir, { recursive: true })

  // Write results
  const resultsPath = join(dateDir, 'sizes.json')
  await writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8')

  console.log('='.repeat(60))
  console.log('📊 Summary:')
  console.log('\n   PLOON (Standard):')
  console.log(`     vs JSON:  ${results.summary.ploon.average_vs_json} reduction`)
  console.log(`     vs XML:   ${results.summary.ploon.average_vs_xml} reduction`)
  console.log(`     vs YAML:  ${results.summary.ploon.average_vs_yaml} reduction`)
  console.log(`     vs TOON:  ${results.summary.ploon.average_vs_toon} reduction`)
  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:  ${results.summary.ploon_minified.average_vs_json} reduction`)
  console.log(`     vs XML:   ${results.summary.ploon_minified.average_vs_xml} reduction`)
  console.log(`     vs YAML:  ${results.summary.ploon_minified.average_vs_yaml} reduction`)
  console.log(`     vs TOON:  ${results.summary.ploon_minified.average_vs_toon} reduction`)
  console.log(`\n   Test cases: ${testCount}`)
  console.log(`\n✅ Results saved to: ${resultsPath}`)
}

benchmarkSizes().catch(console.error)
