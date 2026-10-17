import { BufferBase } from './buffer-base.js'
import { FlacMetadata } from './metadata.js'
import type { MetadataBlock } from './metadata-block/index.js'
import type { PictureBlock } from './metadata-block/picture.js'
import type { VorbisCommentBlock } from './metadata-block/vorbis-comment.js'

export class FlacStream extends BufferBase {
  metadata: FlacMetadata
  frameData: Buffer

  constructor(
    initialValues: { frameData: Buffer } & (
      | { metadataBlocks: MetadataBlock[] }
      | { metadata: FlacMetadata }
    ),
  ) {
    super()
    this.metadata =
      'metadata' in initialValues
        ? initialValues.metadata
        : new FlacMetadata({ metadataBlocks: initialValues.metadataBlocks })
    this.frameData = initialValues.frameData
  }

  get metadataBlocks() {
    return this.metadata.metadataBlocks
  }

  set metadataBlocks(blocks: MetadataBlock[]) {
    this.metadata.metadataBlocks = blocks
  }

  get vorbisCommentBlock(): VorbisCommentBlock | undefined {
    return this.metadata.vorbisCommentBlock
  }

  get pictureBlock(): PictureBlock | undefined {
    return this.metadata.pictureBlock
  }

  static fromBuffer(buffer: Buffer) {
    const metadata = FlacMetadata.fromBuffer(buffer)
    return new FlacStream({ metadata, frameData: buffer.subarray(metadata.length) })
  }

  toBuffer() {
    return Buffer.concat([this.metadata.toBuffer(), this.frameData])
  }

  get length() {
    return this.metadata.length + this.frameData.length
  }
}
