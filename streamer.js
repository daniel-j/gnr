#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const mkfifo = require('named-pipe').mkfifoPromise
const spawn = require('child_process').spawn

const threedog = require('./threedog')
const songs = require('./songs')
const dashwood = require('./dashwood')

const threedogPath = "audio/threedog"
const songsPath = "audio/songs"
const dashwoodPath = "audio/dashwood"

let variant = "male"

let currentPipe = 0
const pipeCount = 4

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
    const outname = "pipe" + currentPipe
    console.log('Playing', filename)
    // return resolve()
    const proc = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'warning', '-re', '-y',
      '-i', filename,
      '-c:a', 'pcm_s16le',
      '-ac', 2, '-ar', 44100, '-sample_fmt', 's16',
      '-f', 'matroska', '-map_metadata', '-1',
      outname
    ], {stdio: 'inherit'})
    proc.on('error', (err) => {
      console.error(err)
      reject(err)
    })
    proc.on('exit', (code) => {
      currentPipe++
      if (currentPipe === pipeCount) {
        currentPipe = 0
      }
      resolve()
    })
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
    console.log(">> Dashwood intro")
    await streamRandomFile(dashwoodPath, dashwood.intro)
    console.log(">> Dashwood episode")
    await streamList(dashwoodPath, sequentialItem(dashwood.episodes))
    return await playSection()
  }

  let arr = ["psaintro", "newsintro"][random(2)]

  switch (arr) {
    case "psaintro":
      console.log(">> PSA intro")
      await streamRandomFile(threedogPath, threedog[arr], true)
      console.log(">> PSA message")
      await streamList(threedogPath, randomItem(threedog.psainfo, true))
      break
    case "newsintro":
      console.log(">> News intro")
      await streamRandomFile(threedogPath, threedog[arr], true)
      console.log(">> News message")
      await streamList(threedogPath, randomItem(threedog.newsstory, true))
      break
  }

  console.log(">> Bye")
  await streamRandomFile(threedogPath, threedog.outro)
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

let mkfifos = []
for (let i = 0; i < pipeCount; i++) {
  try {
    fs.unlinkSync('pipe' + i)
  } catch (err) {}
  mkfifos.push(mkfifo('pipe' + i))
}

Promise.all(mkfifos).then(() => {
  const output = spawn('./startffmpeg.sh', [], {stdio: 'inherit'})
  playSection()
})
// playSection()
