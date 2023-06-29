import { readFileSync, writeFileSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { VorbisCommentBlock } from './metadata-block/vorbis-comment'
import { PictureBlock, PictureType } from './metadata-block/picture'
import { FlacStream } from './stream'
import { MetadataBlockType } from './metadata-block/header'

/**
 * Map tag name to single value (`string`) or multiple values (`string[]`). The tag name does not need to be uppercase.
 * @example
 * ```ts
 * const tagMap: FlacTagMap = {
 *   // single value
 *   title: 'song title',
 *   // multiple values
 *   artist: ['artist A', 'artist B'],
 *   album: 'album name',
 * }
 * ```
 */
export type FlacTagMap = Record<string, string[] | string>
/**
 * The FLAC tags interface for read / write.
 */
export interface FlacTags {
  /** FLAC tag map, see {@link FlacTagMap} */
  tagMap: FlacTagMap
  /** Cover image definition */
  picture?: {
    /** Specify the {@link PictureType}
     * @default PictureType.FrontCover
     * @see https://xiph.org/flac/format.html#metadata_block_picture
     */
    pictureType?: PictureType
    /** MIME type of the image, inferred from buffer by default */
    mime?: string
    /** Description of the image */
    description?: string
    /** Color depth of the image in bits-per-pixel
     * @default 24
     */
    colorDepth?: number
    /**
     * The number of colors used in the image (Only for indexed-color image like GIF)
     * @default 0
     */
    colors?: number
    /** Buffer data of the image */
    buffer: Buffer
  }
}
export { FlacStream } from './stream'
export { BufferBase } from './buffer-base'
export {
  MetadataBlockType,
  MetadataBlockHeaderLength,
  MetadataBlockHeader,
} from './metadata-block/header'
export { MetadataBlock } from './metadata-block/index'
export { OtherMetadataBlock } from './metadata-block/other'
export { PictureBlock, PictureType } from './metadata-block/picture'
export { VorbisCommentBlock } from './metadata-block/vorbis-comment'

const readFlacTagsBuffer = (buffer: Buffer) => {
  const stream = FlacStream.fromBuffer(buffer)
  const { vorbisCommentBlock, pictureBlock } = stream
  const commentList = vorbisCommentBlock?.commentList ?? []
  const tagMap: FlacTagMap = {}
  commentList.forEach(it => {
    const splitIndex = it.indexOf('=')
    if (splitIndex === -1) {
      return
    }
    const key = it.substring(0, splitIndex)
    const value = it.substring(splitIndex + 1)
    const existingValue = tagMap[key]
    if (existingValue) {
      if (Array.isArray(existingValue)) {
        existingValue.push(value)
      } else {
        tagMap[key] = [existingValue, value]
      }
    } else {
      tagMap[key] = value
    }
  })
  const tags: FlacTags = {
    tagMap,
    picture: pictureBlock
      ? {
          pictureType: pictureBlock.pictureType,
          mime: pictureBlock.mime,
          description: pictureBlock.description,
          colorDepth: pictureBlock.colorDepth,
          colors: pictureBlock.colors,
          buffer: pictureBlock.pictureBuffer,
        }
      : undefined,
  }
  return tags
}
/**
 * Read FLAC Tags (Synchronously)
 * @param input FLAC file path or buffer
 */
export const readFlacTagsSync = (input: string | Buffer) => {
  let buffer: Buffer
  if (typeof input === 'string') {
    buffer = readFileSync(input)
  } else {
    buffer = input
  }

  return readFlacTagsBuffer(buffer)
}
/**
 * Read FLAC Tags
 * @param input FLAC file path or buffer
 */
export const readFlacTags = async (input: string | Buffer) => {
  let buffer: Buffer
  if (typeof input === 'string') {
    buffer = await readFile(input)
  } else {
    buffer = input
  }

  return readFlacTagsBuffer(buffer)
}

const createFlacTagsBuffer = (tags: FlacTags, sourceBuffer: Buffer) => {
  const stream = FlacStream.fromBuffer(sourceBuffer)
  const commentList: string[] = []
  Object.entries(tags.tagMap).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(singleValue => commentList.push(`${key.toUpperCase()}=${singleValue}`))
    } else {
      commentList.push(`${key.toUpperCase()}=${value}`)
    }
  })
  if (stream.vorbisCommentBlock) {
    stream.vorbisCommentBlock.commentList = commentList
  } else {
    stream.metadataBlocks.push(
      new VorbisCommentBlock({
        commentList,
      }),
    )
  }

  if (tags.picture) {
    const { pictureBlock } = stream
    if (pictureBlock) {
      stream.metadataBlocks = stream.metadataBlocks.filter(b => b !== pictureBlock)
    }

    stream.metadataBlocks.push(
      new PictureBlock({
        pictureBuffer: tags.picture.buffer,
        mime: tags.picture.mime,
        description: tags.picture.description,
        colorDepth: tags.picture.colorDepth,
        colors: tags.picture.colors,
      }),
    )
  }

  stream.metadataBlocks = stream.metadataBlocks.filter(b => b.type !== MetadataBlockType.Padding)

  return stream.toBuffer()
}
/**
 * Write FLAC Tags to file (Synchronously)
 * @param tags FLAC Tags to write
 * @param filePath FLAC file path
 */
export const writeFlacTagsSync = (tags: FlacTags, filePath: string) => {
  const buffer = readFileSync(filePath)
  writeFileSync(filePath, createFlacTagsBuffer(tags, buffer))
}
/**
 * Write FLAC Tags to file
 * @param tags FLAC Tags to write
 * @param filePath FLAC file path
 */
export const writeFlacTags = async (tags: FlacTags, filePath: string) => {
  const buffer = await readFile(filePath)
  await writeFile(filePath, createFlacTagsBuffer(tags, buffer))
}
