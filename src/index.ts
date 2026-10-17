import { closeSync, openSync } from 'fs'
import { open } from 'fs/promises'
import { VorbisCommentBlock } from './metadata-block/vorbis-comment.js'
import { PictureBlock, PictureType } from './metadata-block/picture.js'
import { FlacMetadata } from './metadata.js'
import { PaddingBlock } from './metadata-block/padding.js'
import { FlacFileReader } from './file-reader.js'
import { FlacFileWriter } from './file-writer.js'

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
const createFlacTagMap = (): FlacTagMap => {
  return new Proxy(
    {},
    {
      get(target, p, receiver) {
        return Reflect.get(target, p.toString().toUpperCase(), receiver) as unknown
      },
      set(target, p, newValue, receiver) {
        return Reflect.set(target, p.toString().toUpperCase(), newValue, receiver)
      },
    },
  )
}
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
     * @see https://www.rfc-editor.org/rfc/rfc9639.html#name-picture
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
  /** Padding data bytes to reserve when the metadata region must grow. Use {@link PaddingBlock.trimPadding} or `0` to remove padding.
   * @default PaddingBlock.defaultPaddingBytes
   * @see https://www.rfc-editor.org/rfc/rfc9639.html#name-padding
   */
  padding?: number
}
export { FlacStream } from './stream.js'
export { FlacMetadata } from './metadata.js'
export { BufferBase } from './buffer-base.js'
export {
  MetadataBlockType,
  MetadataBlockHeaderLength,
  MetadataBlockHeader,
} from './metadata-block/header.js'
export { MetadataBlock } from './metadata-block/index.js'
export { OtherMetadataBlock } from './metadata-block/other.js'
export { PictureBlock, PictureType } from './metadata-block/picture.js'
export { VorbisCommentBlock } from './metadata-block/vorbis-comment.js'
export { PaddingBlock } from './metadata-block/padding.js'

const readFlacTagsMetadata = (metadata: FlacMetadata) => {
  const { vorbisCommentBlock, pictureBlock } = metadata
  const commentList = vorbisCommentBlock?.commentList ?? []
  const tagMap = createFlacTagMap()
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
    padding: metadata.paddingBytes,
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
  if (typeof input !== 'string') {
    return readFlacTagsMetadata(FlacMetadata.fromBuffer(input))
  }
  const fd = openSync(input, 'r')
  try {
    return readFlacTagsMetadata(new FlacFileReader(fd).readSync())
  } finally {
    closeSync(fd)
  }
}
/**
 * Read FLAC Tags
 * @param input FLAC file path or buffer
 */
export const readFlacTags = async (input: string | Buffer) => {
  if (typeof input !== 'string') {
    return readFlacTagsMetadata(FlacMetadata.fromBuffer(input))
  }
  const file = await open(input, 'r')
  try {
    return readFlacTagsMetadata(await new FlacFileReader(file).read())
  } finally {
    await file.close()
  }
}

const updateFlacMetadata = (tags: FlacTags, metadata: FlacMetadata) => {
  const originalMetadataLength = metadata.length
  const commentList: string[] = []
  Object.entries(tags.tagMap).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(singleValue => commentList.push(`${key.toUpperCase()}=${singleValue}`))
    } else {
      commentList.push(`${key.toUpperCase()}=${value}`)
    }
  })
  if (metadata.vorbisCommentBlock) {
    metadata.vorbisCommentBlock.commentList = commentList
  } else {
    metadata.metadataBlocks.push(
      new VorbisCommentBlock({
        commentList,
      }),
    )
  }

  if (tags.picture) {
    const { pictureBlock } = metadata
    if (pictureBlock) {
      metadata.metadataBlocks = metadata.metadataBlocks.filter(b => b !== pictureBlock)
    }

    metadata.metadataBlocks.push(
      new PictureBlock({
        pictureBuffer: tags.picture.buffer,
        mime: tags.picture.mime,
        description: tags.picture.description,
        colorDepth: tags.picture.colorDepth,
        colors: tags.picture.colors,
      }),
    )
  }

  metadata.setPadding(tags.padding ?? PaddingBlock.defaultPaddingBytes, originalMetadataLength)
}
/**
 * Write FLAC Tags to file (Synchronously)
 * @param tags FLAC Tags to write
 * @param filePath FLAC file path
 */
export const writeFlacTagsSync = (tags: FlacTags, filePath: string) => {
  const fd = openSync(filePath, 'r+')
  try {
    const metadata = new FlacFileReader(fd).readSync()
    const originalMetadataLength = metadata.length
    updateFlacMetadata(tags, metadata)
    new FlacFileWriter(fd).writeSync(metadata, originalMetadataLength)
  } finally {
    closeSync(fd)
  }
}
/**
 * Write FLAC Tags to file
 * @param tags FLAC Tags to write
 * @param filePath FLAC file path
 */
export const writeFlacTags = async (tags: FlacTags, filePath: string) => {
  const file = await open(filePath, 'r+')
  try {
    const metadata = await new FlacFileReader(file).read()
    const originalMetadataLength = metadata.length
    updateFlacMetadata(tags, metadata)
    await new FlacFileWriter(file).write(metadata, originalMetadataLength)
  } finally {
    await file.close()
  }
}
