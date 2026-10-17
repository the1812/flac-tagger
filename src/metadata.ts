import { BufferBase } from './buffer-base.js'
import { MetadataBlock } from './metadata-block/index.js'
import {
  MetadataBlockHeader,
  MetadataBlockHeaderLength,
  MetadataBlockType,
} from './metadata-block/header.js'
import { PaddingBlock } from './metadata-block/padding.js'
import { parseBlock } from './metadata-block/parse.js'
import type { PictureBlock } from './metadata-block/picture.js'
import type { VorbisCommentBlock } from './metadata-block/vorbis-comment.js'

export class FlacMetadata extends BufferBase {
  static readonly marker = 'fLaC'

  metadataBlocks: MetadataBlock[]

  constructor(initialValues: { metadataBlocks: MetadataBlock[] }) {
    super()
    this.metadataBlocks = initialValues.metadataBlocks
  }

  static *parse(): Generator<{ length: number; position: number }, FlacMetadata, Buffer> {
    const marker = yield { length: FlacMetadata.marker.length, position: 0 }
    if (marker.toString() !== FlacMetadata.marker) {
      throw new Error('Invalid stream header')
    }
    const blocks: MetadataBlock[] = []
    let position = FlacMetadata.marker.length
    let header: MetadataBlockHeader
    do {
      const headerBuffer = yield { length: MetadataBlockHeaderLength, position }
      header = MetadataBlockHeader.fromBuffer(headerBuffer)
      if (header.type === MetadataBlockType.Padding) {
        blocks.push(new PaddingBlock({ header }))
      } else {
        const data = yield {
          length: header.dataLength,
          position: position + MetadataBlockHeaderLength,
        }
        blocks.push(parseBlock(Buffer.concat([headerBuffer, data])))
      }
      position += MetadataBlockHeaderLength + header.dataLength
    } while (!header.isLast)
    return new FlacMetadata({ metadataBlocks: blocks })
  }

  static fromBuffer(buffer: Buffer) {
    const parser = FlacMetadata.parse()
    let step = parser.next()
    while (!step.done) {
      const { position, length } = step.value
      step = parser.next(buffer.subarray(position, position + length))
    }
    return step.value
  }

  get vorbisCommentBlock(): VorbisCommentBlock | undefined {
    return this.metadataBlocks.find(
      block => block.type === MetadataBlockType.VorbisComment,
    ) as VorbisCommentBlock
  }

  get pictureBlock(): PictureBlock | undefined {
    return this.metadataBlocks.find(
      block => block.type === MetadataBlockType.Picture,
    ) as PictureBlock
  }

  get paddingBytes() {
    return this.metadataBlocks
      .filter(block => block.type === MetadataBlockType.Padding)
      .reduce((total, block) => total + block.length - MetadataBlockHeaderLength, 0)
  }

  setPadding(paddingBytes: number, originalMetadataLength = this.length) {
    this.metadataBlocks = this.metadataBlocks.filter(
      block => block.type !== MetadataBlockType.Padding,
    )
    if (paddingBytes === PaddingBlock.trimPadding) {
      return
    }

    const remaining = originalMetadataLength - this.length
    let totalLength =
      remaining === 0 || remaining >= MetadataBlockHeaderLength
        ? remaining
        : paddingBytes + MetadataBlockHeaderLength
    const maxDataLength = 0xffffff
    while (totalLength >= MetadataBlockHeaderLength) {
      let dataLength = Math.min(totalLength - MetadataBlockHeaderLength, maxDataLength)
      const tail = totalLength - MetadataBlockHeaderLength - dataLength
      if (tail > 0 && tail < MetadataBlockHeaderLength) {
        dataLength -= MetadataBlockHeaderLength - tail
      }
      this.metadataBlocks.push(new PaddingBlock({ paddingBytes: dataLength }))
      totalLength -= MetadataBlockHeaderLength + dataLength
    }
  }

  toBuffer() {
    return Buffer.concat([
      Buffer.from(FlacMetadata.marker),
      ...this.metadataBlocks.map((block, index) => {
        block.header.isLast = index === this.metadataBlocks.length - 1
        block.header.dataLength = block.length - block.header.length
        return block.toBuffer()
      }),
    ])
  }

  get length() {
    return (
      FlacMetadata.marker.length +
      this.metadataBlocks.reduce((total, block) => total + block.length, 0)
    )
  }
}
