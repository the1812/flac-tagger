import { readSync } from 'fs'
import type { FileHandle } from 'fs/promises'
import { FlacMetadata } from './metadata.js'

export class FlacFileReader<Handle extends number | FileHandle> {
  constructor(readonly file: Handle) {}

  readSync(this: FlacFileReader<number>) {
    const parser = FlacMetadata.parse()
    let step = parser.next()
    while (!step.done) {
      step = parser.next(this.readBufferSync(step.value.length, step.value.position))
    }
    return step.value
  }

  async read(this: FlacFileReader<FileHandle>) {
    const parser = FlacMetadata.parse()
    let step = parser.next()
    while (!step.done) {
      step = parser.next(await this.readBuffer(step.value.length, step.value.position))
    }
    return step.value
  }

  readBufferSync(this: FlacFileReader<number>, length: number, position: number) {
    const buffer = Buffer.alloc(length)
    let offset = 0
    while (offset < length) {
      const bytesRead = readSync(this.file, buffer, offset, length - offset, position + offset)
      if (bytesRead === 0) {
        throw new Error('Unexpected end of FLAC file')
      }
      offset += bytesRead
    }
    return buffer
  }

  async readBuffer(this: FlacFileReader<FileHandle>, length: number, position: number) {
    const buffer = Buffer.alloc(length)
    let offset = 0
    while (offset < length) {
      const { bytesRead } = await this.file.read(buffer, offset, length - offset, position + offset)
      if (bytesRead === 0) {
        throw new Error('Unexpected end of FLAC file')
      }
      offset += bytesRead
    }
    return buffer
  }
}
