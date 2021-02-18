#!/usr/bin/env -S liquidsoap -v

let config = of_json(default=[], file.contents("config.json"))

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
            "basename -z \"$filename\""
        ))
    ], m)
    # list.iter(fun(mi) -> print(fst(mi)^": "^snd(mi)), m)
    m
end, dynamic)

output.icecast(%mp3(stereo_mode="joint_stereo", internal_quality=0),
  host = config["icecast_host"],
  port = int_of_string(config["icecast_port"]),
  password = config["icecast_password"],
  mount = config["icecast_mount"],
  name = config["icecast_name"],
  description = config["icecast_description"],
  fallible=true,
  dynamic)
