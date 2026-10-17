import { writeSync, ftruncateSync, fstatSync } from 'fs'
import type { FileHandle } from 'fs/promises'
import type { FlacMetadata } from './metadata.js'
import { FlacFileReader } from './file-reader.js'

export class FlacFileWriter<Handle extends number | FileHandle> {
  private static readonly audioChunkBytes = 1024 * 1024

  private readonly reader: FlacFileReader<Handle>

  constructor(private readonly file: Handle) {
    this.reader = new FlacFileReader(file)
  }

  writeSync(this: FlacFileWriter<number>, metadata: FlacMetadata, originalMetadataLength: number) {
    const buffer = metadata.toBuffer()
    const fileSize = fstatSync(this.file).size
    for (const chunk of FlacFileWriter.audioChunks(
      originalMetadataLength,
      buffer.length,
      fileSize,
    )) {
      const audio = this.reader.readBufferSync(chunk.length, chunk.position)
      this.writeBufferSync(audio, chunk.targetPosition)
    }
    if (buffer.length !== originalMetadataLength) {
      ftruncateSync(this.file, fileSize + buffer.length - originalMetadataLength)
    }
    this.writeBufferSync(buffer, 0)
  }

  async write(
    this: FlacFileWriter<FileHandle>,
    metadata: FlacMetadata,
    originalMetadataLength: number,
  ) {
    const buffer = metadata.toBuffer()
    const fileSize = (await this.file.stat()).size
    for (const chunk of FlacFileWriter.audioChunks(
      originalMetadataLength,
      buffer.length,
      fileSize,
    )) {
      const audio = await this.reader.readBuffer(chunk.length, chunk.position)
      await this.writeBuffer(audio, chunk.targetPosition)
    }
    if (buffer.length !== originalMetadataLength) {
      await this.file.truncate(fileSize + buffer.length - originalMetadataLength)
    }
    await this.writeBuffer(buffer, 0)
  }

  private static *audioChunks(
    originalMetadataLength: number,
    metadataLength: number,
    fileSize: number,
  ) {
    const shift = metadataLength - originalMetadataLength
    if (shift === 0) {
      return
    }
    const audioLength = fileSize - originalMetadataLength
    for (let copied = 0; copied < audioLength; ) {
      const length = Math.min(FlacFileWriter.audioChunkBytes, audioLength - copied)
      const position = shift > 0 ? fileSize - copied - length : originalMetadataLength + copied
      yield { length, position, targetPosition: position + shift }
      copied += length
    }
  }

  private writeBufferSync(this: FlacFileWriter<number>, buffer: Buffer, position: number) {
    let offset = 0
    while (offset < buffer.length) {
      offset += writeSync(this.file, buffer, offset, buffer.length - offset, position + offset)
    }
  }

  private async writeBuffer(this: FlacFileWriter<FileHandle>, buffer: Buffer, position: number) {
    let offset = 0
    while (offset < buffer.length) {
      const { bytesWritten } = await this.file.write(
        buffer,
        offset,
        buffer.length - offset,
        position + offset,
      )
      offset += bytesWritten
    }
  }
}
