#!/usr/bin/env -S liquidsoap -v


let config = file.contents("config.json")
let config = of_json(default=[], config)

security = blank()

def get_song() =
    let (_, headers, _) = http.get("http://localhost:" ^ config["port"])
    let filename = headers["x-filename"]
    [request.create(filename)]
end

let dynamic = audio_to_stereo(request.dynamic.list(get_song))

let dynamic = map_metadata(fun(m) -> begin
    m = list.append([
        ("title", get_process_output(
            env=[("filename", m["filename"])],
            "basename -z \"$filename\""))], m)
    list.iter(fun(mi) ->print(fst(mi)^": "^snd(mi)), m)
    m
end, dynamic)

let source = fallback(track_sensitive = false, [dynamic, security])

output.icecast(%mp3(stereo_mode="joint_stereo", internal_quality=0),
  host = "localhost", port = 8000,
  password = config["icecast_password"],
  mount = "gnr",
  name = "Galaxy News Radio",
  description = "Bringing you the truth, no matter how bad it hurts",
  source)
