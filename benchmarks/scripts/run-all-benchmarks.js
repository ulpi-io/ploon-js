#!/usr/bin/env node
/**
 * Master Benchmark Runner
 * Runs all benchmarks and generates summary report
 */

import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SCRIPTS_DIR = join(process.cwd(), 'benchmarks/scripts')
const RESULTS_DIR = join(process.cwd(), 'benchmarks/results')

console.log('🚀 Running All PLOON Benchmarks\n')
console.log('='.repeat(60))

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const script = join(SCRIPTS_DIR, scriptName)
    const proc = spawn('node', [script], {
      stdio: 'inherit',
      cwd: process.cwd()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

async function runAllBenchmarks() {
  try {
    // Run benchmarks in sequence
    console.log('\n📊 Running Size Benchmark...\n')
    await runScript('2-benchmark-sizes.js')

    console.log('\n\n🎯 Running Token Benchmark...\n')
    await runScript('3-benchmark-tokens.js')

    console.log('\n\n🔄 Running Round-Trip Benchmark...\n')
    await runScript('4-benchmark-roundtrip.js')

    // Load results
    const date = new Date().toISOString().split('T')[0]
    const resultsDir = join(RESULTS_DIR, date)

    const sizesData = JSON.parse(await readFile(join(resultsDir, 'sizes.json'), 'utf-8'))
    const tokensData = JSON.parse(await readFile(join(resultsDir, 'tokens.json'), 'utf-8'))
    const roundtripData = JSON.parse(await readFile(join(resultsDir, 'roundtrip.json'), 'utf-8'))

    // Display summary
    console.log('\n\n' + '='.repeat(60))
    console.log('📈 FINAL SUMMARY')
    console.log('='.repeat(60))

    console.log('\n📊 Size Benchmarks - PLOON (Standard):')
    console.log(`   vs JSON:  ${sizesData.summary.ploon.average_vs_json} reduction`)
    console.log(`   vs XML:   ${sizesData.summary.ploon.average_vs_xml} reduction`)
    console.log(`   vs YAML:  ${sizesData.summary.ploon.average_vs_yaml} reduction`)
    console.log(`   vs TOON:  ${sizesData.summary.ploon.average_vs_toon} reduction`)

    console.log('\n📊 Size Benchmarks - PLOON (Minified):')
    console.log(`   vs JSON:  ${sizesData.summary.ploon_minified.average_vs_json} reduction`)
    console.log(`   vs XML:   ${sizesData.summary.ploon_minified.average_vs_xml} reduction`)
    console.log(`   vs YAML:  ${sizesData.summary.ploon_minified.average_vs_yaml} reduction`)
    console.log(`   vs TOON:  ${sizesData.summary.ploon_minified.average_vs_toon} reduction`)

    console.log('\n🎯 Token Benchmarks (tiktoken - GPT-5) - PLOON (Standard):')
    console.log(`   vs JSON:  ${tokensData.summary.ploon.average_token_reduction_vs_json} reduction`)
    console.log(`   vs XML:   ${tokensData.summary.ploon.average_token_reduction_vs_xml} reduction`)
    console.log(`   vs YAML:  ${tokensData.summary.ploon.average_token_reduction_vs_yaml} reduction`)
    console.log(`   vs TOON:  ${tokensData.summary.ploon.average_token_reduction_vs_toon} reduction`)

    console.log('\n🎯 Token Benchmarks (tiktoken - GPT-5) - PLOON (Minified):')
    console.log(`   vs JSON:  ${tokensData.summary.ploon_minified.average_token_reduction_vs_json} reduction`)
    console.log(`   vs XML:   ${tokensData.summary.ploon_minified.average_token_reduction_vs_xml} reduction`)
    console.log(`   vs YAML:  ${tokensData.summary.ploon_minified.average_token_reduction_vs_yaml} reduction`)
    console.log(`   vs TOON:  ${tokensData.summary.ploon_minified.average_token_reduction_vs_toon} reduction`)

    console.log('\n🔄 Round-Trip Accuracy:')
    console.log(`   Total tests: ${roundtripData.summary.total}`)
    console.log(`   Passed: ${roundtripData.summary.passed} ✅`)
    console.log(`   Failed: ${roundtripData.summary.failed} ❌`)
    console.log(`   Pass rate: ${roundtripData.summary.pass_rate}`)

    console.log('\n💰 Cost Savings (GPT-5 @ $1.25/1M tokens):')
    console.log('\n   PLOON (Standard):')
    console.log(`     Average saved per 1M calls vs JSON: ${tokensData.summary.ploon.average_cost_saved_per_1m_vs_json}`)
    console.log('\n   PLOON (Minified):')
    console.log(`     Average saved per 1M calls vs JSON: ${tokensData.summary.ploon_minified.average_cost_saved_per_1m_vs_json}`)
    console.log(`\n   ROI Example: ${tokensData.summary.roi_example.scenario}`)
    console.log(`     - With JSON:  ${tokensData.summary.roi_example.json_cost}/month`)
    console.log(`     - With PLOON: ${tokensData.summary.roi_example.ploon_cost}/month`)
    console.log(`     - Savings:    ${tokensData.summary.roi_example.monthly_savings}/month`)

    console.log('\n' + '='.repeat(60))
    console.log(`✅ All benchmarks complete!`)
    console.log(`📁 Results saved to: ${resultsDir}`)
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message)
    process.exit(1)
  }
}

runAllBenchmarks().catch(console.error)
