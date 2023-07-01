import { describe, test, beforeEach, afterEach } from 'vitest'
import { copyFile, unlink } from 'fs/promises'
import { writeFlacTags, readFlacTags, writeFlacTagsSync, readFlacTagsSync } from '../src/index'
import { assertTags, tags } from './common'

const sourcePath = './test/audio-blank.flac'
const writePath = './test/audio-write.flac'
beforeEach(async () => {
  await copyFile(sourcePath, writePath)
})
afterEach(async () => {
  await unlink(writePath)
})
describe('write FLAC tags', () => {
  test('write async', async () => {
    await writeFlacTags(tags, writePath)
    const actualTags = await readFlacTags(writePath)
    assertTags(actualTags)
  })
  test('write sync', () => {
    writeFlacTagsSync(tags, writePath)
    const actualTags = readFlacTagsSync(writePath)
    assertTags(actualTags)
  })
})
