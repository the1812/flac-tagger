import { MetadataBlock } from './index.js'
import { MetadataBlockHeader } from './header.js'

export class OtherMetadataBlock extends MetadataBlock {
  header: MetadataBlockHeader
  data: Buffer

  constructor(initialValues: { header: MetadataBlockHeader; data: Buffer }) {
    super()
    Object.assign(this, initialValues)
  }

  static fromBuffer(buffer: Buffer) {
    const header = MetadataBlockHeader.fromBuffer(buffer)
    return new OtherMetadataBlock({
      header,
      data: buffer.subarray(header.length, header.length + header.dataLength),
    })
  }

  toBuffer() {
    return Buffer.concat([this.header.toBuffer(), this.data])
  }

  get length() {
    return this.header.length + this.data.length
  }
}
