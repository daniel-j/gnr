#!/usr/bin/env node

const fs = require('fs/promises')
const bitwise = require('bsa/lib/bitwise')
const split = require('bsa/lib/split')
const read = require('bsa/lib/read')
const path = require('path')
const write = require('bsa/lib/write')
const co = require('co')

const outDir = "out"

const matchesSound = [
  /^sound\/songs\/radio\/licensed\/mus_((?!_mono).)*\.mp3$/
]

const matchesVoices = [
  /^sound\/voice\/fallout3.esm\/maleuniquethreedog\/radiogalax_.*\.ogg$/,
  /^sound\/voice\/fallout3.esm\/uniqueradioplay\/radiogalax_radiognrdashwoo_.*.ogg$/,
  /^sound\/voice\/brokensteel.esm\/maleuniquethreedog\/radiogalax_.*.ogg$/
]

// From bsa module, but modified to work with regex filters
function extract(buf, where, matches) {
  if (!Buffer.isBuffer(buf)) {
    throw new TypeError('Argument 1 must be a Buffer')
  }

  where = where || '.'

  if (typeof where != 'string') {
    throw new TypeError('Argument 2 must be valid path to folder')
  }

  const header = read.header(buf)

  if (!bitwise.get(header.archiveFlags, 1) || !bitwise.get(header.archiveFlags, 2)) {
    throw new Error(`Archive doesn't contains real names of folders or files`)
  }

  const folder_record_size = 16
  var names

  return co(function* () {
    yield write.folder(where)

    /* read folders */
    for(let i = 0, folders_offset = 0, files_count = 0; i < header.folders; ++i) {
      const folder = read.folder(buf, folders_offset + header.offset)
      const tree = read.tree(buf, folder, folder.offset - header.totalFileNameLength + 1)

      /* read file names */
      if (i == 0) {
        const names_offset = tree.files[0].offset - header.totalFileNameLength
        names = split(buf.slice(names_offset, names_offset + header.totalFileNameLength), 0)
      }

      for(const file of tree.files) {
        /* join file name */
        const name = names[files_count].toString('ascii')

        /* check if file matches */
        if (matches.some((m) => m.test(path.join(tree.name.split('\\').join('/'), name)))) {
          /* create folder */
          yield write.folder(path.join(where, tree.name.split('\\').join(path.sep)))

          console.log(path.join(tree.name.split('\\').join(path.sep), name))
          /* read file data */
          const data = buf.slice(file.offset, file.offset + file.size)
          yield write.file(path.join(where, tree.name.split('\\').join(path.sep), name), data)
        } else {
          // console.log("IGNORE", path.join(tree.name.split('\\').join(path.sep), name))
        }
        ++files_count
      }

      folders_offset += folder_record_size
    }
  })
}

async function extractBSA(bsaFile, matches) {
  console.log("Extracting " + bsaFile)
  const data = await fs.readFile(bsaFile)
  await extract(data, outDir, matches)
  console.log("Extraction of " + bsaFile + " complete!")
}

extractBSA('data/Fallout - Sound.bsa', matchesSound).then(() => {
  extractBSA('data/Fallout - Voices.bsa', matchesVoices).then(() => {
    extractBSA('data/BrokenSteel - Main.bsa', matchesVoices).then(() => {
      console.log("Extraction complete!")
    })
  })
})
