#!/usr/bin/env -S liquidsoap -v

configsrc = file.contents("config.json")
config = json.parse(default=[("error", "json")], configsrc)

def get_song() =
    headers = http.get("http://localhost:" ^ config["port"]).headers
    filename = headers["x-filename"]
	if filename == "" then
		null()
    else
		request.create(filename)
	end
end

dynamic = audio_to_stereo(request.dynamic(get_song))

dynamic = map_metadata(fun(m) -> begin
    m = list.append([
        ("title", process.read(
            env=[("filename", m["filename"])],
            "basename -z \"$filename\""
        ))
    ], m)
    # list.iter(fun(mi) -> print(fst(mi)^": "^snd(mi)), m)
    m
end, dynamic)

dynamic = rotate([dynamic, blank(duration=0.8)])

output.icecast(%mp3(stereo_mode="joint_stereo", internal_quality=0),
  host = config["icecast_host"],
  port = int_of_string(config["icecast_port"]),
  password = config["icecast_password"],
  mount = config["icecast_mount"],
  name = config["icecast_name"],
  description = config["icecast_description"],
  fallible=true,
  dynamic)
