# node-mkv-forced-stereo

PLEX will sometimes not play videos with mono audio tracks.  This creates a forced
stereo tracks from selected tracks.  The script will create new tracks from an existing
MKV container, it will also generate a new MKV container if a non-MKV file is specified.

## Requires

* **mkvtoolnix** v25.0.0 ('Prog Noir') - https://mkvtoolnix.download
* **ffmpeg** - https://www.ffmpeg.org
* **node 10.14.x** - https://nodejs.org/en/

### Linux (Debian Based)

`apt install mkvtoolnix ffmpeg`

### OSX

`brew install mkvtoolnix ffmpeg`

## Clone the repo.

`git clone git@github.com:pjobson/node-mkv-forced-stereo.git`

## Install requirements.

```
cd node-mkv-forced-stereo
npm link
```

## Try It Out

`forced-stereo /path/to/your/movie.mkv`

### Example Output

`forced-stereo ~/Desktop/trailer.mkv`

```
--------------------------------
Generating file names.
Parsing movie file.

Found 1 Audio Track(s)

	ID:         1
	Codec:      AAC
	Channels:   1
	Language:   und
	Track Name: undefined

Select IDs to process [1]: 1

Making temp path: /tmp/1544212180721
Extracting selected audio track(s).
⁘⁙⁙⁘⁘⁘⁙⁙⁙⁘⁘⁙⁘⁘⁘⁘⁙⁙⁘⁘⁙⁙⁘⁘⁙⁙⁘⁘⁙⁘⁘⁘⁙⁘⁘⁙⁙⁘⁙⁙⁙⁘⁘⁙⁘⁘⁙⁙⁙⁘

Converting mono audio to forced stereo.
→ Converting Track 1
⁘⁘⁙⁙⁙⁙⁙⁙⁘⁘⁘⁙⁘⁘⁙⁘⁘⁙⁘⁘⁘⁙⁘⁙⁙⁘⁘⁘⁘⁙⁘⁙⁘⁘⁙⁘⁙⁘⁙⁘⁙⁙⁙⁙⁘⁙⁙⁙
Building: /home/pjobson/code/node-mkv-forced-stereo/temp/trailer.forced_stereo.mkv

Removing Temp Path.

Done! Verify With:
mkvinfo /home/pjobson/code/node-mkv-forced-stereo/temp/trailer.forced_stereo.mkv
```
