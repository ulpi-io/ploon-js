/**
 * Path Writer
 * Builds path strings like:
 * - 1:1, 2:1, 3:1 (depth:index format for arrays)
 * - 1 , 2 , 3  (depth + space format for objects)
 */

import type { PloonConfig } from '../types'

type PathSegment = { type: 'array'; index: number } | { type: 'object' }

export class PathWriter {
  private pathSegments: PathSegment[] = []
  private config: PloonConfig

  constructor(config: PloonConfig) {
    this.config = config
  }

  /**
   * Get current path as string
   * - Arrays: "depth:index" (e.g., "2:1")
   * - Objects: "depth " (e.g., "2 ")
   */
  getCurrentPath(): string {
    if (this.pathSegments.length === 0) {
      return ''
    }
    const depth = this.pathSegments.length
    const lastSegment = this.pathSegments[this.pathSegments.length - 1]

    if (!lastSegment) {
      return ''
    }

    if (lastSegment.type === 'array') {
      return `${depth}${this.config.pathSeparator}${lastSegment.index}`
    } else {
      return `${depth} `
    }
  }

  /**
   * Push an array segment (with index)
   */
  pushArray(index: number): void {
    this.pathSegments.push({ type: 'array', index })
  }

  /**
   * Push an object segment (no index)
   */
  pushObject(): void {
    this.pathSegments.push({ type: 'object' })
  }

  /**
   * Push a new path segment (backwards compatibility)
   * Defaults to array type
   */
  push(index: number): void {
    this.pushArray(index)
  }

  /**
   * Pop the last path segment
   */
  pop(): void {
    this.pathSegments.pop()
  }

  /**
   * Get depth (number of path segments)
   */
  getDepth(): number {
    return this.pathSegments.length
  }

  /**
   * Reset to empty path
   */
  reset(): void {
    this.pathSegments = []
  }

  /**
   * Clone the current path writer
   */
  clone(): PathWriter {
    const clone = new PathWriter(this.config)
    clone.pathSegments = [...this.pathSegments]
    return clone
  }
}
