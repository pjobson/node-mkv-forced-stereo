#!/usr/bin/env node

'use strict';

const Q         = require('q');                  // https://github.com/kriskowal/q
const which     = require('which');              // https://github.com/npm/node-which
const fs        = require('fs');                 // https://nodejs.org/api/fs.html
const path      = require('path');               // https://nodejs.org/api/path.html
const exec      = require('child_process').exec; // https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
const tempPath  = require('os').tmpdir();        // https://nodejs.org/api/os.html#os_os_tmpdir
const _         = require('lodash');             // https://github.com/lodash/lodash
const colors    = require('colors');             // https://github.com/Marak/colors.js
const prompt    = require('prompt');             // https://github.com/flatiron/prompt
      prompt.colors  = false;
      prompt.message = '';

const spinner = {
	characters: ['\u2058','\u2059'],
	to: false,
	start: () => {
		this.to = setInterval(() => {
			process.stdout.write(spinner.characters[Math.floor(Math.random() * 2)]);
		},100);
	},
	stop: () => {
		console.log('');
		clearInterval(this.to);
	}
};

const fstro = {
	init: () => {
		if (process.argv.length !==3) {
			console.log('missing file name');
			process.exit();
		}

		if (!fs.lstatSync(process.argv[2]).isFile()) {
			console.log(`${process.argv[2]} is not a file.`);
			process.exit();
		}

		const ffmpeg   = which.sync('ffmpeg', {nothrow: true})   || console.log(`Missing: ffmpeg`);
		const ffprobe  = which.sync('ffprobe', {nothrow: true})  || console.log(`Missing: ffprobe`);
		const mkvmerge = which.sync('mkvmerge', {nothrow: true}) || console.log(`Missing: mkvmerge`);
		if (!ffmpeg || !mkvmerge) process.exit();

		console.log('--------------------------------');
		fstro.genFileNames(process.argv[2]);

		fstro.monoTracks = [];
		fstro.stereoTracks = [];

		fstro.mkvIdentify()
			.then(fstro.audioTrackSelectionPrompt)
			.then(fstro.mkvExtractMonoAudio)
			.then(fstro.mono2stereo)
			.then(fstro.buildMKV)
			.then(fstro.cleanUp)
			.then(fstro.done);

	},
	genFileNames: fname => {
		console.log('Generating file names.');
		fstro.movieOriginal = fs.realpathSync(fname);
		fstro.originalName  = path.basename(fname);
		fstro.localPath     = path.dirname(path.resolve(fname));
	},
	mkvIdentify: () => {
		const deferred = Q.defer();
		// mkvmerge -J mono_audio.mkv
		console.log('Identifying MKV file.\n');
		const cmd = `mkvmerge -J "${fstro.movieOriginal}"`;
		exec(cmd, (err, out) => {
			if (err) {
				console.log(colors.red(`Error: ${err}`));
				deferred.reject(err);
			}
			fstro.movieJson = JSON.parse(out);
			fstro.audioTracksAll  = _.filter(fstro.movieJson.tracks, track => track.type==='audio');
			fstro.audioTracksMono = _.filter(fstro.audioTracksAll, track => track.properties.audio_channels===1);
			deferred.resolve();
		});
		return deferred.promise;
	},
	audioTrackSelectionPrompt: () => {
		const deferred = Q.defer();
		console.log(`Found ${fstro.audioTracksAll.length} Audio Track(s)`);
		console.log();
		fstro.audioTracksAll.forEach(track => {
			console.log(`	ID:         ${track.id}`);
			console.log(`	Codec:      ${track.codec}`);
			console.log(`	Channels:   ${track.properties.audio_channels}`);
			console.log(`	Language:   ${track.properties.language}`);
			console.log(`	Track Name: ${track.properties.track_name}`);
			console.log(``);
		});

		const monoAudioIds = _.map(fstro.audioTracksMono, 'id');
		const audioTracksAllIds = _.map(fstro.audioTracksAll, 'id');

		prompt.start();
		prompt.get({
			properties: {
				ids: {
					description: `Select IDs to process [${monoAudioIds.join(',')}]`
				}
			}
		}, (err, result) => {
			if (err) {
				console.log(colors.red(`Error: ${err}`));
				deferred.reject(err);
				process.exit();
			}

			result.ids = (result.ids==='') ? monoAudioIds : _.map(result.ids.match(/(\d+)/g), id => parseInt(id, 10));

			fstro.selectedIds = _.remove(_.sortedUniq(result.ids), n => _.indexOf(audioTracksAllIds, n) >= 0);

			if (fstro.selectedIds.length === 0) {
				console.log(colors.red('Error: no tracks selected'));
				deferred.reject('no tracks selected');
				process.exit();
			}

			console.log('');

			deferred.resolve();
		});

		return deferred.promise;
	},
	mkvExtractMonoAudio: () => {
		let deferred = Q.defer();
		// mkvextract tracks mono_audio.mkv 1:mono.ac3
		console.log('Extracting mono audio track(s) from MKV.');
		let cmd = `mkvextract tracks "${fstro.movieOriginal}"`;

		fstro.selectedIds.forEach(id => {
			const track = _.find(fstro.audioTracksAll, { id: id });
			const ext   = _.findKey(codecIds, val => val===track.properties.codec_id);
			fstro.monoTracks.push(`${id}.mono.${ext}`);
			cmd = `${cmd} ${id}:${tempPath}/${id}.mono.${ext}`;
		});

		spinner.start();
		exec(cmd, (err, out) => {
			if (err) {
				console.log(colors.red(`Error: ${err}`));
				deferred.reject(err);
			}
			spinner.stop();
			deferred.resolve();
		});
		return deferred.promise;
	},
	mono2stereo: () => {
		let deferred = Q.defer();
		// ffmpeg -i mono.ac3 -ac 2 stereo.ac3
		console.log('Converting mono audio to forced stereo.');
		spinner.start();
		fstro.tcount = fstro.monoTracks.length;
		fstro.monoTracks.forEach((track, n) => {
			console.log(`→ Converting Track ${fstro.selectedIds[n]}`);
			const cmd = `ffmpeg -y -hide_banner \\
			  -nostats -loglevel 0 -i ${tempPath}/${track} \\
			  -ac 2 ${tempPath}/${fstro.selectedIds[n]}.stereo.aac`;
			fstro.stereoTracks.push(`${fstro.selectedIds[n]}.stereo.aac`);

			exec(cmd, (err, out) => {
				if (err) {
					console.log(colors.red(`Error: ${err}`));
					deferred.reject(err);
				}

				if (--fstro.tcount === 0) {
					spinner.stop();
					deferred.resolve();
				}
			});
		});

		return deferred.promise;
	},
	buildMKV: () => {
		let deferred = Q.defer();
		console.log(`Building: ${fstro.localPath}/forced_stereo.mkv`)
		// mkvmerge -q -o forced_stereo.mkv original.mkv  \
		//   --language 0:swe  \
		//   --track-name "0:ForcedStereo (AC3)"  \
		//   --default-track 0:no  \
		//   --forced-track  0:no  \
		//    -D -S TEMP/1.stereo.aac \
		//   --language 0:eng  \
		//   --track-name "0:ForcedStereo (AC3) Commentary"  \
		//   --default-track 0:no  \
		//   --forced-track  0:no  \
		//    -D -S TEMP/2.stereo.aac

		let cmd = `mkvmerge -q -o ${fstro.localPath}/forced_stereo.mkv ${fstro.movieOriginal} `;
		fstro.stereoTracks.forEach((audioTrack, n) => {
			const refTrack = _.find(fstro.audioTracksAll, track => track.id === fstro.selectedIds[n]);
			cmd = `${cmd} \\
			  --language 0:${refTrack.properties.language}  \\
			  --track-name "0:Forced Stereo (AC3) ${refTrack.properties.track_name || '' }"  \\
			  --default-track 0:no  \\
			  --forced-track  0:no  \\
			  -D -S ${tempPath}/${audioTrack} \\
			`;
		});
		spinner.start();
		exec(cmd, (err, out) => {
			if (err) {
				console.log(colors.red(`Error: ${err}`));
				deferred.reject(err);
			}
			spinner.stop();
			deferred.resolve();
		});

		return deferred.promise;
	},
	cleanUp: () => {
		let deferred = Q.defer();
		console.log('Removing Temp Files');
		let cmd = 'rm';
		fstro.monoTracks.forEach((track, n) => {
			cmd = `${cmd} ${tempPath}/${track} ${tempPath}/${fstro.stereoTracks[n]} `;
		})
		exec(cmd, (err, out) => {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	},
	done: () => {
		console.log('');
		console.log('Done! Verify With:');
		console.log(`mkvinfo ${fstro.localPath}/forced_stereo.mkv`);
		process.exit();
	}
};


const codecIds = {
	'ac3':   'A_AC3',
	'eac3':  'A_EAC3',
	'mp2':   'A_MPEG/L2',
	'mp3':   'A_MPEG/L3',
	'dts':   'A_DTS',
	'wav':   'A_PCM/INT/LIT',
	'wav':   'A_PCM/INT/BIG',
	'flac':  'A_FLAC',
	'caf':   'A_ALAC',
	'oga':   'A_VORBIS',
	'opus':  'A_OPUS',
	'aac':   'A_AAC',
	'ra':    'A_REAL/',
	'mlp':   'A_MLP',
	'thd':   'A_TRUEHD',
	'tta':   'A_TTA1',
	'wv':    'A_WAVPACK4',
	'avi':   'V_MS/VFW/FOURCC',
	'h264':  'V_MPEG4/ISO/AVC',
	'h265':  'V_MPEGH/ISO/HEVC',
	'rv':    'V_REAL/',
	'm1v':   'V_MPEG1',
	'm2v':   'V_MPEG2',
	'ogv':   'V_THEORA',
	'ivf':   'V_VP8',
	'ivf':   'V_VP9',
	'srt':   'S_TEXT/UTF8',
	'srt':   'S_TEXT/ASCII',
	'ssa':   'S_TEXT/SSA',
	'ass':   'S_TEXT/ASS',
	'ssa':   'S_SSA',
	'ass':   'S_ASS',
	'sub':   'S_VOBSUB',
	'usf':   'S_TEXT/USF',
	'ogx':   'S_KATE',
	'sup':   'S_HDMV/PGS',
	'textst': 'S_HDMV/TEXTST',
	'vtt':    'S_TEXT/WEBVTT'
}

fstro.init();



