#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const mkfifo = require('named-pipe').mkfifoPromise
const spawn = require('child_process').spawn

const threedog = require('./threedog.json')
const songs = require('./songs.json')

const threedogPath = "audio/threedog"
const songsPath = "audio/songs"

let currentPipe = 0
const pipeCount = 2
let currentSong = 0

function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}

function streamFile (filename) {
  return new Promise((resolve, reject) => {
    const outname = "pipe" + currentPipe
    console.log('>> Playing', filename)
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

function random (size) {
  return Math.floor(Math.random() * size)
}

function randomItem (arr) {
  const index = random(arr.length)
  return arr[index]
}

function streamRandomFile(prefix, arr) {
  return streamFile(path.join(prefix, randomItem(arr)))
}

async function streamList(prefix, arr) {
  for (let i = 0; i < arr.length; i++) {
    const filename = arr[i]
    await streamFile(path.join(prefix, filename))
  }
}

function getSong () {
  if (currentSong === 0) {
    shuffle(songs)
  }

  currentSong++
  if (currentSong === songs.length) {
    currentSong = 0
  }

  return songs[currentSong]
}

async function playSection (lastsong) {
  await streamRandomFile(threedogPath, threedog.hello)

  if (lastsong) {
    await streamFile(path.join(threedogPath, threedog.musicex[lastsong]))
  }

  let arr = ["psaintro", "newsintro"][random(2)]

  switch (arr) {
    case "psaintro":
      await streamRandomFile(threedogPath, threedog[arr])
      await streamList(threedogPath, randomItem(threedog.psainfo))
      break
    case "newsintro":
      await streamRandomFile(threedogPath, threedog[arr])
      await streamList(threedogPath, randomItem(threedog.newsstory))
      break
  }

  await streamRandomFile(threedogPath, threedog.outro)
  await streamRandomFile(threedogPath, threedog.musicintro)

  const songCount = 3 + random(2)
  let song
  for (let i = 0; i < songCount; i++) {
    song = getSong()
    console.log('Preparing song', song)
    if (i === 0 && threedog.musicpresent[song] && random(5) === 0) {
      await streamFile(path.join(threedogPath, threedog.musicpresent[song]))
    }
    await streamFile(path.join(songsPath, song))
  }
  lastsong = null
  if (threedog.musicex[song] && random(5) === 0) {
    lastsong = song
  }
  await playSection(lastsong)  // recursive
}

let mkfifos = []
for (let i = 0; i < pipeCount; i++) {
  try {
    fs.unlinkSync('pipe' + i)
  } catch (err) {}
  mkfifos.push(mkfifo('pipe' + i))
}

Promise.all(mkfifos).then(() => playSection())
// playSection()
