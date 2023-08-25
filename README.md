# flac-tagger

Pure JavaScript FLAC Tag writer and reader.

## Installation

```powershell
npm install flac-tagger
```

## Usage

### Read FLAC Tags
```ts
import { FlacTags, readFlacTags } from 'flac-tagger'
import { readFile } from 'fs/promises'

// read from file path
const tagsFromFile: FlacTags = await readFlacTags('path/to/file.flac')

// read from buffer
const buffer = await readFile('path/to/file.flac')
const tagsFromBuffer: FlacTags = await readFlacTags(buffer)

// read tag by vorbis comment name (case-insensitive)
const { title, artist, album } = tagsFromFile.tagMap
// read cover image
const coverBuffer = tagsFromFile.picture?.buffer
```

### Write FLAC Tags
```ts
import { FlacTagMap, writeFlacTags } from 'flac-tagger'
import { readFile } from 'fs/promises'

// write vorbis comments (names are case-insensitive)
const tagMap: FlacTagMap = {
  // single value
  title: 'song title',
  // multiple values
  artist: ['artist A', 'artist B'],
  album: 'album name',
}
await writeFlacTags(
  {
    tagMap,
    // (optional) cover image
    picture: {
      buffer: await readFile('coverImage.jpg'),
    }
  },
  // path to existing flac file
  'path/to/file.flac',
)
```

## Specification

- [FLAC - Format](https://xiph.org/flac/format.html)
- [Ogg Vorbis Documentation](https://www.xiph.org/vorbis/doc/v-comment.html)
