# node-mkv-forced-stereo
PLEX will sometimes not play videos with mono audio tracks.  This creates a forced stereo track and removes the original audio tracks.

Clone the repo.

`git clone git@github.com:pjobson/node-mkv-forced-stereo.git`

Install requirements.

`cd node-mkv-forced-stereo
npm install`

Force some stereos.

`mkv-forced-stereo.node.js /path/to/your/movie.mkv`

You'll need ffmpeg and MKVToolNix to use this.


