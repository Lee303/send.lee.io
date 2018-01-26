datauri() {
  local type=$(file -0 --mime-type "$1" | cut -f 2 -d ' ')
  cat <(printf "data:${type};base64,") <(base64 "$1")
}

send.lee.io() {
	datauri $1 | curl --data-binary @- -XPUT https://send.lee.io?filename=$2
}
