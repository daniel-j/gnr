#!/usr/bin/env node

const fs = require('fs/promises')
const path = require('path')
const spawn = require('child_process').spawn
const http = require('http')

const threedog = require('./playlists/threedog')
const songs = require('./playlists/songs')
const radioplay = require('./playlists/radioplay')

const threedogPath = "out/sound/voice/fallout3.esm/maleuniquethreedog"
const songsPath = "out/sound/songs/radio/licensed"
const radioplayPath = "out/sound/voice/fallout3.esm/uniqueradioplay"

const config = require('./config.json')

let variant = 'male'
let karma = 'good'
let level = 1

const queuedCallback = {
  cb: null,
  filename: ''
}

async function checkAudioFiles(obj, root) {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      const filename = path.join(root, obj[key])
      // console.log("Checking", filename)
      if ((await fs.access(filename)) !== undefined) {
        throw new Error("File " + filename + " does not exist")
      }
    } else if (typeof obj[key] === 'object') {
      await checkAudioFiles(obj[key], root)
    }
  }
}

function requestListener (req, res) {
  if (queuedCallback.cb) {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'x-filename': queuedCallback.filename })
    res.end(queuedCallback.filename)
    queuedCallback.cb()
    queuedCallback.cb = null
    queuedCallback.filename = ''
  } else {
    res.end()
  }
}

function random (size) {
  return Math.floor(Math.random() * size)
}

function shuffle(array, retry = false) {
  if (array.length <= 1) return array
  let last = array[array.length - 1]
  for (let i = array.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [array[i], array[j]] = [array[j], array[i]]
  }
  if (array.length > 1 && retry) {
    while (array[0] === last) {
      console.log("Reshuffling")
      array = shuffle(array, false)
    }
  }
  return array
}

function streamFile (filename) {
  return new Promise((resolve, reject) => {
    console.log(filename)
    queuedCallback.filename = filename
    queuedCallback.cb = resolve
  })
}

function randomItem (arr, retry = false) {
  arr.position = arr.position || 0
  if (arr.position >= arr.length) {
    arr.position = 0
  }
  if (arr.position === 0) {
    shuffle(arr, retry)
  }
  return arr[arr.position++]
}

function sequentialItem (arr) {
  arr.position = arr.position || 0
  if (arr.position >= arr.length) {
    arr.position = 0
  }
  return arr[arr.position++]
}

function streamRandomFile(prefix, arr, retry = false) {
  return streamFile(path.join(prefix, randomItem(arr, retry)))
}

async function streamList(prefix, arr) {
  for (let i = 0; i < arr.length; i++) {
    const filename = arr[i]
    await streamFile(path.join(prefix, filename))
  }
}

async function playSection (lastsong) {
  if (lastsong) {
    console.log(">> Last song", lastsong)
    await streamFile(path.join(threedogPath, threedog.musicextro[lastsong]))
    lastsong = null
  }
  console.log(">> Hello")
  await streamRandomFile(threedogPath, threedog.hello, true)

  if (random(8) === 0) {
    console.log(">> Radioplay intro")
    await streamRandomFile(radioplayPath, radioplay.intro)
    console.log(">> Radioplay episode")
    await streamList(radioplayPath, sequentialItem(radioplay.episodes))
    return await playSection()
  }

  console.log(">> News intro")
  await streamRandomFile(threedogPath, threedog.newslink, true)
  console.log(">> News message")
  await streamList(threedogPath, randomItem(threedog.newsstory, true))

  console.log(">> Bye")
  await streamRandomFile(threedogPath, threedog.outro)

  if (random(2) === 0) {
    console.log(">> PSA intro")
    await streamRandomFile(threedogPath, threedog.psaintro, true)
    console.log(">> PSA message")
    await streamList(threedogPath, randomItem(threedog.psainfo, true))
  }

  console.log(">> Music intro")
  await streamRandomFile(threedogPath, threedog.musicintro)

  const songCount = 3 + random(3)
  console.log(">> Playing", songCount, "songs")
  let song
  for (let i = 0; i < songCount; i++) {
    song = randomItem(songs, true)
    if (i === 0 && threedog.musicpresent[song] && random(5) === 0) {
      console.log(">> Song presentation")
      await streamFile(path.join(threedogPath, threedog.musicpresent[song]))
    }
    await streamFile(path.join(songsPath, song))
  }

  if (threedog.musicextro[song] && random(5) === 0) {
    lastsong = song
  }
  await playSection(lastsong)
}

Promise.all([
  checkAudioFiles(threedog, threedogPath),
  checkAudioFiles(radioplay, radioplayPath),
  checkAudioFiles(songs, songsPath),
  checkAudioFiles(Object.keys(threedog.musicextro), songsPath),
  checkAudioFiles(Object.keys(threedog.musicpresent), songsPath)
]).then(() => {
  const server = http.createServer(requestListener)
  server.listen(config.port, () => {
    console.log("Listening on port " + config.port)
    playSection()
    const liquidsoap = spawn('liquidsoap', ['-v', 'gnr.liq', '--'], {stdio: ['inherit', 'inherit', 'inherit']})
    liquidsoap.on('close', (code) => {
      console.log("Liquidsoap exited with code", code)
      server.close()
    })
  })
})
