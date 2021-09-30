# node-mkv-forced-stereo

PLEX will sometimes not play videos with mono audio tracks.  This creates a forced
stereo tracks from selected tracks.  The script will create new tracks from an existing
MKV container, it will also generate a new MKV container if a non-MKV file is specified.

For background information, the only reason I know about **forced stereo** is because I 
happened to get a copy of a bootleg album set from Pink Floyd called 
[A Tree Full of Secrets](https://rateyourmusic.com/release/unauth/pink-floyd/a-tree-full-of-secrets/).
Several of the tracks were noted as *fake stereo* which led me to understanding that I could
modify an audio track in mono to fake or forced stereo track basically by cloning the mono track into
the left and right channels.  Thakfully ffmpeg does this automagically, you could theoretically also
clone a mono channel into 6 channels for 5.1 surround, though I suspect the results would be lackluster.

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

## Install Script

I know .. I know .. I could put this in npm, there's a lot of junk in there, they don't need my junk.

```
cd node-mkv-forced-stereo
npm install
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
Building: /home/pjobson/Desktop/trailer.forced_stereo.mkv

Removing Temp Path.

Done! Verify With:
mkvinfo ~/Desktop/trailer.forced_stereo.mkv
```
