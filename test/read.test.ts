import { describe, test } from 'vitest'
import { readFlacTags, readFlacTagsSync } from '../src/index'
import { assertTags } from './common'

const readPath = './test/audio-read.flac'
describe('read FLAC tags', () => {
  test('read async', async () => {
    const actualTags = await readFlacTags(readPath)
    assertTags(actualTags)
  })
  test('read sync', () => {
    const actualTags = readFlacTagsSync(readPath)
    assertTags(actualTags)
  })
})
