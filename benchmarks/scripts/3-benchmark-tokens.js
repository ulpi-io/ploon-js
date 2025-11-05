#!/usr/bin/env node
/**
 * Benchmark Token Counts
 * Compare token efficiency using tiktoken (GPT-4 encoding)
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { encoding_for_model } from 'tiktoken'

const COMPARISON_DIR = join(process.cwd(), 'benchmarks/data/comparison')
const RESULTS_DIR = join(process.cwd(), 'benchmarks/results')

console.log('🎯 Benchmarking Token Counts (tiktoken - GPT-5)\n')

function countTokens(text) {
  try {
    // Use cl100k_base encoding (compatible with GPT-5, GPT-4, etc.)
    const encoding = encoding_for_model('gpt-4')
    const tokens = encoding.encode(text)
    const count = tokens.length
    encoding.free()
    return count
  } catch (error) {
    console.warn('Tiktoken failed, using estimation')
    return Math.ceil(text.length / 4)
  }
}

function calculateCost(tokens, callsPerMonth) {
  // OpenAI API Pricing (January 2025):
  // GPT-5: $1.25 per 1M input tokens (flagship model)
  // GPT-5 mini: $0.25 per 1M input tokens
  // GPT-5 nano: $0.05 per 1M input tokens
  // GPT-5 pro: $15.00 per 1M input tokens
  // Using GPT-5 pricing for calculations

  // Calculate total tokens for N calls
  const totalTokens = tokens * callsPerMonth

  // Calculate cost: (total tokens / 1M) * $1.25
  const costPer1M = (totalTokens / 1_000_000) * 1.25

  // Monthly cost is same as cost per 1M calls when callsPerMonth = 1M
  const monthlyCost = costPer1M

  return {
    costPer1M: `$${costPer1M.toFixed(2)}`,
    monthly: `$${monthlyCost.toFixed(2)}`
  }
}

async function benchmarkTokens() {
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
  let totalTokensSaved = {
    ploon: { json: 0, xml: 0, yaml: 0, toon: 0 },
    ploonMin: { json: 0, xml: 0, yaml: 0, toon: 0 }
  }
  let testCount = 0

  for (const testCase of testCases) {
    const testDir = join(COMPARISON_DIR, testCase)
    const tokens = {}

    console.log(`📦 ${testCase}`)

    // Count tokens for each format
    for (const format of formats) {
      const filePath = join(testDir, `data.${format}`)
      try {
        const content = await readFile(filePath, 'utf-8')
        const tokenCount = countTokens(content)
        const cost = calculateCost(tokenCount, 1_000_000) // Cost per 1M calls

        tokens[format] = {
          tokens: tokenCount,
          cost_per_1m_calls: cost.costPer1M
        }
      } catch (err) {
        tokens[format] = { tokens: 0, cost_per_1m_calls: '$0.00' }
      }
    }

    // Calculate savings
    const jsonTokens = tokens.json.tokens
    const xmlTokens = tokens.xml.tokens
    const yamlTokens = tokens.yaml.tokens
    const toonTokens = tokens.toon.tokens
    const ploonTokens = tokens.ploon.tokens
    const ploonMinTokens = tokens['min.ploon'].tokens

    if (jsonTokens > 0) {
      const tokensSavedPloon = jsonTokens - ploonTokens
      const tokensSavedPloonMin = jsonTokens - ploonMinTokens
      const percentagePloon = (tokensSavedPloon / jsonTokens * 100).toFixed(1)
      const percentagePloonMin = (tokensSavedPloonMin / jsonTokens * 100).toFixed(1)
      const costSavedPloon = calculateCost(tokensSavedPloon, 1_000_000)
      const costSavedPloonMin = calculateCost(tokensSavedPloonMin, 1_000_000)

      const savings = {
        ploon: {
          tokens_saved_vs_json: tokensSavedPloon,
          percentage_vs_json: percentagePloon + '%',
          cost_saved_per_1m_vs_json: costSavedPloon.costPer1M,
          tokens_saved_vs_xml: xmlTokens - ploonTokens,
          percentage_vs_xml: ((xmlTokens - ploonTokens) / xmlTokens * 100).toFixed(1) + '%',
          tokens_saved_vs_yaml: yamlTokens - ploonTokens,
          percentage_vs_yaml: ((yamlTokens - ploonTokens) / yamlTokens * 100).toFixed(1) + '%',
          tokens_saved_vs_toon: toonTokens - ploonTokens,
          percentage_vs_toon: ((toonTokens - ploonTokens) / toonTokens * 100).toFixed(1) + '%'
        },
        ploon_minified: {
          tokens_saved_vs_json: tokensSavedPloonMin,
          percentage_vs_json: percentagePloonMin + '%',
          cost_saved_per_1m_vs_json: costSavedPloonMin.costPer1M,
          tokens_saved_vs_xml: xmlTokens - ploonMinTokens,
          percentage_vs_xml: ((xmlTokens - ploonMinTokens) / xmlTokens * 100).toFixed(1) + '%',
          tokens_saved_vs_yaml: yamlTokens - ploonMinTokens,
          percentage_vs_yaml: ((yamlTokens - ploonMinTokens) / yamlTokens * 100).toFixed(1) + '%',
          tokens_saved_vs_toon: toonTokens - ploonMinTokens,
          percentage_vs_toon: ((toonTokens - ploonMinTokens) / toonTokens * 100).toFixed(1) + '%'
        }
      }

      results.testCases[testCase] = { tokens, savings }

      // Accumulate for PLOON
      totalSavings.ploon.json += (jsonTokens - ploonTokens) / jsonTokens * 100
      totalSavings.ploon.xml += (xmlTokens - ploonTokens) / xmlTokens * 100
      totalSavings.ploon.yaml += (yamlTokens - ploonTokens) / yamlTokens * 100
      totalSavings.ploon.toon += (toonTokens - ploonTokens) / toonTokens * 100
      totalTokensSaved.ploon.json += tokensSavedPloon
      totalTokensSaved.ploon.xml += xmlTokens - ploonTokens
      totalTokensSaved.ploon.yaml += yamlTokens - ploonTokens
      totalTokensSaved.ploon.toon += toonTokens - ploonTokens

      // Accumulate for PLOON minified
      totalSavings.ploonMin.json += (jsonTokens - ploonMinTokens) / jsonTokens * 100
      totalSavings.ploonMin.xml += (xmlTokens - ploonMinTokens) / xmlTokens * 100
      totalSavings.ploonMin.yaml += (yamlTokens - ploonMinTokens) / yamlTokens * 100
      totalSavings.ploonMin.toon += (toonTokens - ploonMinTokens) / toonTokens * 100
      totalTokensSaved.ploonMin.json += tokensSavedPloonMin
      totalTokensSaved.ploonMin.xml += xmlTokens - ploonMinTokens
      totalTokensSaved.ploonMin.yaml += yamlTokens - ploonMinTokens
      totalTokensSaved.ploonMin.toon += toonTokens - ploonMinTokens

      testCount++

      console.log(`   JSON:        ${jsonTokens} tokens (${tokens.json.cost_per_1m_calls} per 1M calls)`)
      console.log(`   XML:         ${xmlTokens} tokens (${tokens.xml.cost_per_1m_calls} per 1M calls)`)
      console.log(`   YAML:        ${yamlTokens} tokens (${tokens.yaml.cost_per_1m_calls} per 1M calls)`)
      console.log(`   TOON:        ${toonTokens} tokens (${tokens.toon.cost_per_1m_calls} per 1M calls)`)
      console.log(`   PLOON:       ${ploonTokens} tokens (${tokens.ploon.cost_per_1m_calls} per 1M calls)`)
      console.log(`   PLOON (min): ${ploonMinTokens} tokens (${tokens['min.ploon'].cost_per_1m_calls} per 1M calls)`)
      console.log(`   💰 PLOON Savings: ${percentagePloon}% vs JSON, ${savings.ploon.percentage_vs_toon} vs TOON`)
      console.log(`   💰 PLOON (min) Savings: ${percentagePloonMin}% vs JSON, ${savings.ploon_minified.percentage_vs_toon} vs TOON\n`)
    }
  }

  // Calculate summary
  if (testCount > 0) {
    const avgSavingsPloonJson = totalSavings.ploon.json / testCount
    const avgSavingsPloonMinJson = totalSavings.ploonMin.json / testCount
    const avgCostSavedPloon = calculateCost(totalTokensSaved.ploon.json / testCount, 1_000_000)
    const avgCostSavedPloonMin = calculateCost(totalTokensSaved.ploonMin.json / testCount, 1_000_000)

    results.summary = {
      ploon: {
        average_token_reduction_vs_json: avgSavingsPloonJson.toFixed(1) + '%',
        average_token_reduction_vs_xml: (totalSavings.ploon.xml / testCount).toFixed(1) + '%',
        average_token_reduction_vs_yaml: (totalSavings.ploon.yaml / testCount).toFixed(1) + '%',
        average_token_reduction_vs_toon: (totalSavings.ploon.toon / testCount).toFixed(1) + '%',
        average_cost_saved_per_1m_vs_json: avgCostSavedPloon.costPer1M
      },
      ploon_minified: {
        average_token_reduction_vs_json: avgSavingsPloonMinJson.toFixed(1) + '%',
        average_token_reduction_vs_xml: (totalSavings.ploonMin.xml / testCount).toFixed(1) + '%',
        average_token_reduction_vs_yaml: (totalSavings.ploonMin.yaml / testCount).toFixed(1) + '%',
        average_token_reduction_vs_toon: (totalSavings.ploonMin.toon / testCount).toFixed(1) + '%',
        average_cost_saved_per_1m_vs_json: avgCostSavedPloonMin.costPer1M
      },
      test_count: testCount,
      roi_example: {
        scenario: '10M API calls per month',
        json_cost: calculateCost(totalTokensSaved.ploon.json / testCount + (totalTokensSaved.ploon.json / testCount / (avgSavingsPloonJson / 100)), 10_000_000).monthly,
        ploon_cost: calculateCost(totalTokensSaved.ploon.json / testCount / (avgSavingsPloonJson / 100), 10_000_000).monthly,
        monthly_savings: calculateCost(totalTokensSaved.ploon.json / testCount, 10_000_000).monthly
      }
    }
  }

  // Save results
  const date = new Date().toISOString().split('T')[0]
  const resultsPath = join(RESULTS_DIR, date, 'tokens.json')
  await writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8')

  console.log('='.repeat(60))
  console.log('🎯 Summary:')
  console.log('\n   PLOON (Standard):')
  console.log(`     vs JSON:  ${results.summary.ploon.average_token_reduction_vs_json} reduction`)
  console.log(`     vs XML:   ${results.summary.ploon.average_token_reduction_vs_xml} reduction`)
  console.log(`     vs YAML:  ${results.summary.ploon.average_token_reduction_vs_yaml} reduction`)
  console.log(`     vs TOON:  ${results.summary.ploon.average_token_reduction_vs_toon} reduction`)
  console.log(`     Cost saved per 1M calls: ${results.summary.ploon.average_cost_saved_per_1m_vs_json}`)
  console.log('\n   PLOON (Minified):')
  console.log(`     vs JSON:  ${results.summary.ploon_minified.average_token_reduction_vs_json} reduction`)
  console.log(`     vs XML:   ${results.summary.ploon_minified.average_token_reduction_vs_xml} reduction`)
  console.log(`     vs YAML:  ${results.summary.ploon_minified.average_token_reduction_vs_yaml} reduction`)
  console.log(`     vs TOON:  ${results.summary.ploon_minified.average_token_reduction_vs_toon} reduction`)
  console.log(`     Cost saved per 1M calls: ${results.summary.ploon_minified.average_cost_saved_per_1m_vs_json}`)
  console.log(`\n   Test cases: ${testCount}`)
  console.log(`\n✅ Results saved to: ${resultsPath}`)
}

benchmarkTokens().catch(console.error)
