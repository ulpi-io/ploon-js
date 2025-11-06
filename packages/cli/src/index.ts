#!/usr/bin/env node
/**
 * PLOON CLI
 * Command-line tool for PLOON format conversion
 */

import { Command } from 'commander'
import { consola } from 'consola'
import { readInput, writeOutput, detectFormat } from './utils'
import { convert, ConvertOptions } from './convert'
import { showStats } from './stats'

const program = new Command()

program
  .name('ploon')
  .description('PLOON - Path-Level Object Oriented Notation CLI')
  .version('1.0.3')

program
  .argument('[input]', 'Input file (or stdin if not provided)')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--from <format>', 'Input format: json|xml|yaml (default: auto-detect)')
  .option('--to <format>', 'Output format: json|xml|yaml (converts from PLOON)')
  .option('--minify', 'Output compact format (semicolon-separated)')
  .option('--prettify', 'Output standard format (newline-separated)')
  .option('--validate', 'Validate PLOON format only')
  .option('--stats', 'Show token count comparison')
  .option('-c, --config <file>', 'Custom configuration file')
  .option('--field-delimiter <char>', 'Field delimiter (default: |)')
  .option('--path-separator <char>', 'Path separator (default: :)')
  .option('--array-marker <char>', 'Array size marker (default: #)')
  .option('--escape-char <char>', 'Escape character (default: \\)')
  .option('--no-preserve-empty-fields', 'Remove null/empty values from arrays (cleaner output)')
  .action(async (input, options) => {
    try {
      // Read input
      const inputData = await readInput(input)

      // Build config object (only include options that were actually provided)
      const config: any = {}
      if (options.fieldDelimiter !== undefined) config.fieldDelimiter = options.fieldDelimiter
      if (options.pathSeparator !== undefined) config.pathSeparator = options.pathSeparator
      if (options.arrayMarker !== undefined) config.arraySizeMarker = options.arrayMarker
      if (options.escapeChar !== undefined) config.escapeChar = options.escapeChar
      if (options.preserveEmptyFields !== undefined) config.preserveEmptyFields = options.preserveEmptyFields

      // Build convert options
      const convertOptions: ConvertOptions = {
        inputFormat: options.from,
        outputFormat: options.to,
        minify: options.minify,
        prettify: options.prettify,
        validate: options.validate,
        showStats: options.stats,
        config: Object.keys(config).length > 0 ? config : undefined
      }

      // Detect input format if not specified
      if (!convertOptions.inputFormat && !convertOptions.outputFormat) {
        convertOptions.inputFormat = detectFormat(input, inputData)
      }

      // Convert
      const result = await convert(inputData, convertOptions)

      // Show stats if requested
      if (options.stats) {
        showStats(inputData, result, convertOptions)
      }

      // Write output (if not validation only)
      if (!options.validate) {
        await writeOutput(result, options.output)
      }

      if (options.validate) {
        consola.success('PLOON format is valid')
      }
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program.parse()
