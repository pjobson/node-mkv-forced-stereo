# node-mkv-forced-stereo

PLEX will sometimes not play videos with mono audio tracks.  This creates a forced stereo track and removes the original audio tracks.

## Requires

* **mkvtoolnix** v25.0.0 ('Prog Noir') - https://mkvtoolnix.download
* **ffmpeg** - https://www.ffmpeg.org
* **nodejs** - https://nodejs.org/en/

I'm on node 10.x.x, you can probably use as low as 8.x.x, though I haven't tested it.

### Linux (Debian Based)

`apt install mkvtoolnix ffmpeg`

### OSX

`brew install mkvtoolnix ffmpeg`

## Clone the repo.

`git clone git@github.com:pjobson/node-mkv-forced-stereo.git`

## Install requirements.

```
cd node-mkv-forced-stereo
npm install
```

## Try It Out

`./mkv-forced-stereo.node.js /path/to/your/movie.mkv`

### Example Output

I keep all of my repos in `~/code/`, yours will be wherever you cloned it to.

`~/code/node-mkv-forced-stereo/mkv-forced-stereo.node.js ~/Desktop/input_movie.mkv`

```
--------------------------------
Generating file names.
Identifying MKV file.

Found 2 Audio Track(s)

	ID:         1
	Codec:      AAC
	Channels:   1
	Language:   swe
	Track Name: undefined

	ID:         2
	Codec:      AC-3
	Channels:   1
	Language:   eng
	Track Name: Commentary

Select IDs to process [1,2]:

Extracting mono audio track(s) from MKV.
⁙⁙⁙⁘⁙⁘⁙⁘⁙⁘⁙
Converting mono audio to forced stereo.
→ Converting Track 1
→ Converting Track 2
⁙⁙⁘⁙⁘⁙⁘⁙⁙⁙⁙⁘⁘⁙⁙⁘⁘⁙⁘⁘⁘⁘⁙⁙⁙⁙⁘⁙⁙⁙⁘⁙⁙⁙⁘⁘⁙⁘⁙⁘⁙⁙⁘⁘⁘⁙⁘⁘⁘⁙⁙⁘⁙⁙⁘⁙⁙⁘⁙⁙⁘⁘⁘⁘⁙
⁘⁘⁙⁙⁙⁙⁙⁘⁘⁙⁙⁙⁘⁘⁘⁙⁘⁙⁙⁘⁘⁙⁙⁙⁘⁘⁙⁙⁘⁙⁘⁙⁘⁘⁘⁙⁘⁘⁙⁙⁙⁘⁘⁙⁘⁘⁙⁙⁙⁘⁙⁘⁙⁙⁘⁙⁙⁙⁙⁘⁘⁙⁙⁙⁙
⁘⁘⁘⁘⁘⁘⁙⁙⁘⁘⁘⁙⁙⁘⁘⁘⁙⁘⁙⁘⁘⁙⁘⁘⁘⁘⁘⁙⁘⁘⁘⁘⁙⁙⁘⁘⁘⁘⁙⁘⁘⁙⁙⁙⁘⁙⁙⁘⁘⁘⁙⁙⁘⁙⁘⁘⁘⁘⁘⁘⁙⁙⁙⁘⁘
⁙⁘⁙⁘⁙⁙⁘⁙⁙⁙⁙⁙⁙⁙⁘⁘⁙⁘⁘⁘⁙⁙⁙⁘⁙⁙⁙⁙⁙⁘⁘⁘⁘⁙⁘⁘⁙⁙⁘⁙⁘⁙⁘⁘⁙⁙⁙⁘⁘⁘⁙⁙⁘⁘⁘⁘⁙⁘⁘⁘⁙⁙⁙⁙⁘
⁘⁙⁘⁘⁘⁘⁙⁙⁘⁙⁘⁙⁘⁙⁙⁙⁙⁘⁙⁙⁘⁘⁙⁘⁙⁙⁙⁘⁙⁘⁘⁘⁙⁙⁘⁘⁙⁙⁘⁘⁘⁘⁙⁘⁙⁙⁘⁙⁘⁙⁙⁙⁙⁙⁘⁘⁙⁘⁙⁘⁙⁘⁙⁙⁘
⁙⁙⁘⁘⁙⁙⁙⁙⁘⁘⁘⁘⁙⁙⁘⁙⁙⁙⁘⁙⁘⁙⁙⁘⁙⁙⁙⁘⁘⁙⁘⁘⁙⁘⁘⁙⁙⁙⁘⁙⁘⁘⁙⁙⁙⁙⁘⁙⁘⁘⁘⁘⁘⁙⁘⁘⁙⁘⁘⁙⁙⁘⁙⁘⁙
⁙⁙⁙⁘⁘⁘⁘⁘⁘⁙⁘⁘⁙⁘⁙⁘⁘⁘⁘⁙⁙⁙⁘⁙⁙⁙⁘⁘⁘⁘⁘⁘⁙⁙⁘⁙⁘⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁘⁙⁘⁘⁘⁙⁘⁘⁘⁙⁙⁙⁙⁙⁘⁙⁘⁘
⁙⁙⁙⁘⁙⁙⁙⁙⁙⁘⁘⁘⁙⁘⁘⁘⁘⁙⁙⁙⁘⁙⁙⁙⁘⁙⁘⁘⁙⁘⁘⁘⁘⁘⁙⁙⁙⁙⁘⁘⁙⁙⁙⁙⁘⁘⁘⁘⁙⁘⁙⁙⁙⁙⁘⁙⁘⁘⁙⁙⁙⁘⁙⁘⁘
⁙⁙⁙⁘⁘⁙⁘⁙⁘⁘⁘⁘⁘⁙⁙⁙⁙⁘⁙⁘⁙⁘⁙⁘⁘⁙⁘⁘⁘⁘⁙⁘⁙⁘⁙⁘⁘⁙⁘⁘⁘⁘⁘⁙⁘⁙⁙⁙⁙⁙⁙⁙⁙⁘⁘⁙⁘⁙⁘⁙⁘⁘⁙⁘⁘
⁙⁘⁙⁘⁘⁙⁘⁙⁘⁘⁙⁙⁙⁙⁘⁙⁙⁙⁘⁘⁙⁙⁘⁘⁘⁘⁙⁙⁘⁘⁘⁙⁙⁙⁙⁘⁙⁙⁘⁘⁘⁘⁙⁙⁘⁙⁘⁘⁘⁙⁘⁙⁘⁙⁘⁙⁙⁙⁘⁘⁙⁙⁘⁘⁘
⁙⁙⁙⁘⁙⁘⁘⁙⁙⁘⁙⁘⁙⁙⁙⁙⁙⁘⁘⁘⁙⁙⁘⁙⁘⁘⁙⁘⁙⁙⁙⁘⁙⁘⁙⁙⁙⁙⁘⁘⁙⁘⁘⁘⁙⁙⁙⁙⁙⁘⁘⁘⁘⁙⁙⁙⁘⁙⁘⁘⁙⁘⁘⁙⁘
⁙⁙⁙⁘⁙⁙⁘⁙⁙⁙⁘⁘⁙⁙⁘⁘⁘⁙⁘⁙⁘⁘⁙⁘⁘⁘⁘⁘⁘⁙⁘⁙⁘⁙⁘⁘⁘⁙⁙⁙⁘⁙⁙⁘⁙⁘⁙⁘⁙⁘⁙⁙⁙⁙⁙⁙⁙⁘⁘⁙⁘⁘⁙
Building: /Users/pjobson/Desktop/forced_stereo.mkv
⁘⁙⁙⁘⁙⁘⁘⁙⁘⁙⁙⁘⁙⁙⁙⁙⁙⁘⁘⁙⁙⁙⁘⁙⁘⁙⁙⁙⁘⁘⁘⁙⁙⁘⁙⁘⁙⁙⁘⁙⁘⁙⁙⁙⁘⁘⁘⁘⁘⁙⁘⁘⁙⁙⁘⁙⁘⁘⁙⁙⁙⁘⁙⁘⁙⁙⁙⁙
Removing Temp Files

Done! Verify With:
mkvinfo /Users/pjobson/Desktop/forced_stereo.mkv
```
