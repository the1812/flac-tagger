import { MetadataBlockType } from './header.js'
import { MetadataBlock } from './index.js'
import { OtherMetadataBlock } from './other.js'
import { PictureBlock } from './picture.js'
import { VorbisCommentBlock } from './vorbis-comment.js'

export const parseBlock = (buffer: Buffer): MetadataBlock => {
  const blockType = (buffer.readUint8() & 0b01111111) as MetadataBlockType
  switch (blockType) {
    case MetadataBlockType.VorbisComment:
      return VorbisCommentBlock.fromBuffer(buffer)
    case MetadataBlockType.Picture:
      return PictureBlock.fromBuffer(buffer)
    default:
      return OtherMetadataBlock.fromBuffer(buffer)
  }
}
