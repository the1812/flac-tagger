import { BufferBase } from '../buffer-base.js'
import type { MetadataBlockHeader } from './header.js'

export abstract class MetadataBlock extends BufferBase {
  abstract header: MetadataBlockHeader
  get type() {
    return this.header.type
  }
}
