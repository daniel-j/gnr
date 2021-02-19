Galaxy News Radio
=================

This is a replication of the in-game radio station GNR from Fallout 3.

Uses [Liquidsoap](https://www.liquidsoap.info) (tested with v1.4.3)

Install Node.JS (and run `npm install`) and set up Icecast.

Create file `config.json` with the following content:
```json
{
	"port": "8013",

	"icecast_host": "127.0.0.1",
	"icecast_port": "8000",
	"icecast_mount": "gnr",
	"icecast_name": "Galaxy News Radio",
	"icecast_description": "Bringing you the truth, no matter how bad it hurts",
	"icecast_password": "hackme"
}

```

Put the files `Fallout3 - Sounds.bsa`, `Fallout3 - Voices.bsa` and `BrokenSteel - Main.bsa` in the data folder, from your Fallout 3 GOTY Data folder. Run `./extract.js` to extract the audio files.

Run `npm start` to launch.

Enjoy!

Tune in: https://radio.djazz.se/icecast/gnr
