import { MetadataBlock } from './index.js'
import { MetadataBlockHeader, MetadataBlockType } from './header.js'

export class PaddingBlock extends MetadataBlock {
  static readonly defaultPaddingBytes = 1024 * 16
  static readonly trimPadding = 0

  header: MetadataBlockHeader
  paddingBytes: number

  constructor(initialValues: { header?: MetadataBlockHeader; paddingBytes?: number } = {}) {
    super()
    const {
      header = new MetadataBlockHeader({ type: MetadataBlockType.Padding }),
      paddingBytes = initialValues.header?.dataLength ?? PaddingBlock.defaultPaddingBytes,
    } = initialValues
    this.header = header
    this.paddingBytes = paddingBytes
    this.header.dataLength = paddingBytes
  }

  static fromBuffer(buffer: Buffer) {
    return new PaddingBlock({ header: MetadataBlockHeader.fromBuffer(buffer) })
  }

  toBuffer() {
    this.header.dataLength = this.paddingBytes
    const buffer = Buffer.alloc(this.length)
    this.header.toBuffer().copy(buffer)
    return buffer
  }

  get length() {
    return this.header.length + this.paddingBytes
  }
}
