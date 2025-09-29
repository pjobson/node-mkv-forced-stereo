#!/usr/bin/env node

'use strict';

// Converted to use native Promises instead of Q
const which     = require('which');              // https://github.com/npm/node-which
const fs        = require('fs');                 // https://nodejs.org/api/fs.html
const path      = require('path');               // https://nodejs.org/api/path.html
const exec      = require('child_process').exec; // https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
const os_tmpdir = require('os').tmpdir();        // https://nodejs.org/api/os.html#os_os_tmpdir
const tempPath  = `${os_tmpdir}/${new Date().getTime()}`;
const colors    = require('colors');             // https://github.com/Marak/colors.js
const { mkdirp } = require('mkdirp');            // https://github.com/substack/node-mkdirp
const readline  = require('readline');            // https://nodejs.org/api/readline.html
const cliProgress = require('cli-progress');      // https://github.com/npkgz/cli-progress

// Progress bar configuration
const progressBars = {
	current: null,
	multiBar: null,

	init() {
		this.multiBar = new cliProgress.MultiBar({
			clearOnComplete: false,
			hideCursor: true,
			format: ' {task} |{bar}| {percentage}% | ETA: {eta_formatted} | {value}/{total}',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			etaBuffer: 50
		}, cliProgress.Presets.shades_classic);
	},

	create(task, total) {
		if (!this.multiBar) this.init();
		return this.multiBar.create(total, 0, {
			task,
			eta_formatted: 'calculating...'
		});
	},

	formatTime(seconds) {
		if (seconds === null || isNaN(seconds) || seconds === Infinity) {
			return 'calculating...';
		}
		if (seconds < 60) {
			return `${Math.round(seconds)}s`;
		}
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.round(seconds % 60);
		return `${minutes}m ${remainingSeconds}s`;
	},

	stop() {
		if (this.multiBar) {
			this.multiBar.stop();
			this.multiBar = null;
		}
	}
};

const fstro = {
	selectAllMono: false,
	movieFile: '',
	// Track naming template
	trackNameTemplate: 'Forced Stereo (AAC) {original_name}',
	// Parallel processing settings
	maxConcurrency: 4, // Default concurrent processes
	init: () => {
		// Parse command line arguments
		const args = process.argv.slice(2);

		// Check for help flag
		if (args.includes('--help') || args.includes('-h')) {
			console.log('Usage: forced-stereo [OPTIONS] <video-file>');
			console.log('');
			console.log('Options:');
			console.log('  --select-all-mono           Automatically select all mono audio tracks');
			console.log('  --track-name-template TEXT  Custom naming template for stereo tracks');
			console.log('                              Variables: {original_name}, {language}, {lang}, {codec}, {id}, {channels}');
			console.log('                              Default: "Forced Stereo (AAC) {original_name}"');
			console.log('  --max-concurrency N         Maximum concurrent ffmpeg processes (default: 4)');
			console.log('  --help, -h                  Show this help message');
			console.log('');
			console.log('Examples:');
			console.log('  forced-stereo movie.mkv');
			console.log('  forced-stereo --select-all-mono movie.mkv');
			console.log('  forced-stereo --track-name-template "Stereo {lang} {original_name}" movie.mkv');
			console.log('  forced-stereo --max-concurrency 8 movie.mkv');
			console.log('  forced-stereo --select-all-mono --max-concurrency 2 movie.mkv');
			process.exit(0);
		}

		fstro.selectAllMono = args.includes('--select-all-mono');

		// Parse track naming template
		const templateIndex = args.indexOf('--track-name-template');
		if (templateIndex !== -1 && templateIndex + 1 < args.length) {
			fstro.trackNameTemplate = args[templateIndex + 1];
		}

		// Parse max concurrency
		const concurrencyIndex = args.indexOf('--max-concurrency');
		if (concurrencyIndex !== -1 && concurrencyIndex + 1 < args.length) {
			const concurrency = parseInt(args[concurrencyIndex + 1], 10);
			if (!isNaN(concurrency) && concurrency > 0 && concurrency <= 16) {
				fstro.maxConcurrency = concurrency;
			} else {
				console.log('Error: --max-concurrency must be a number between 1 and 16');
				process.exit(1);
			}
		}

		fstro.movieFile = args.find(arg => !arg.startsWith('--') &&
			arg !== fstro.trackNameTemplate &&
			arg !== args[concurrencyIndex + 1]);

		if (!fstro.movieFile) {
			console.log('missing file name');
			console.log('Use --help for usage information');
			process.exit();
		}

		if (!fs.lstatSync(fstro.movieFile).isFile()) {
			console.log(`${fstro.movieFile} is not a file.`);
			process.exit();
		}

		const ffmpeg   = which.sync('ffmpeg',   {nothrow: true})   || console.log(`Missing: ffmpeg`);
		const ffprobe  = which.sync('ffprobe',  {nothrow: true})   || console.log(`Missing: ffprobe`);
		const mkvmerge = which.sync('mkvmerge', {nothrow: true})   || console.log(`Missing: mkvmerge`);
		if (!ffmpeg || !mkvmerge) process.exit();

		console.log(`
      ______                    _____ _
     |  ____|                  / ____| |
     | |__ ___  _ __ ___ ___  | (___ | |_ ___ _ __ ___  ___
     |  __/ _ \\| '__/ __/ _ \\  \\___ \\| __/ _ \\ '__/ _ \\/ _ \\
     | | | (_) | | | (_|  __/  ____) | ||  __/ | |  __/ (_) |
     |_|  \\___/|_|  \\___\\___| |_____/ \\__\\___|_|  \\___|\\___/
		`);

		fstro.genFileNames(fstro.movieFile)
			.then(fstro.mkvIdentify)
			.then(fstro.audioTrackSelectionPrompt)
			.then(fstro.makeTempDir)
			.then(fstro.mkvExtractMonoAudio)
			.then(() => fstro.mono2stereo())
			.then(fstro.buildMKV)
			.then(fstro.cleanUp)
			.then(fstro.done)
			.catch(error => {
				console.log(colors.red(`\nError: ${error.message || error}`));
				process.exit(1);
			});

	},
	genFileNames: fname => {
		return new Promise((resolve, reject) => {
			console.log('Generating file names.');
			fstro.movieOriginal = fs.realpathSync(fname);
			fstro.originalName  = path.basename(fname);
			fstro.localPath     = path.dirname(path.resolve(fname));
			fstro.outputName    = `${fstro.movieOriginal.split('/').pop().replace(/\.\w+$/,'')}.forced_stereo.mkv`;
			fstro.monoTracks    = [];
			fstro.stereoTracks  = [];
			resolve();
		});
	},
	mkvIdentify: () => {
		return new Promise((resolve, reject) => {
			// mkvmerge -J mono_audio.mkv
			console.log('Parsing movie file.\n');
			const cmd = `mkvmerge -J "${fstro.movieOriginal}"`;
			exec(cmd, (err, out) => {
				if (err) {
					console.log(colors.red(`Error: ${err}`));
					reject(err);
					return;
				}
				fstro.movieJSON       = JSON.parse(out);
				fstro.isMatroska      = fstro.movieJSON.container.type === 'Matroska';
				fstro.audioTracksAll  = fstro.movieJSON.tracks.filter(track => track.type==='audio');
				fstro.audioTracksMono = fstro.audioTracksAll.filter(track => track.properties.audio_channels===1);
				fstro.videoTracks     = fstro.movieJSON.tracks.filter(track => track.type==='video');
				fstro.subtitleTracks  = fstro.movieJSON.tracks.filter(track => track.type==='subtitles');
				fstro.hasChapters     = fstro.movieJSON.chapters && fstro.movieJSON.chapters.length > 0;
				resolve();
			});
		});
	},
	formatTrackName: (template, track) => {
		const originalName = track.properties.track_name || '';
		const language = track.properties.language || 'und';
		const codec = track.codec || 'Unknown';
		const id = track.id.toString();
		const channels = track.properties.audio_channels || 'Unknown';

		return template
			.replace(/{original_name}/g, originalName)
			.replace(/{language}/g, language)
			.replace(/{codec}/g, codec)
			.replace(/{id}/g, id)
			.replace(/{channels}/g, channels)
			.replace(/{lang}/g, language.toUpperCase()) // Short uppercase language
			.trim();
	},
	// Parallel processing utility with concurrency control
	runWithConcurrency: async (tasks, maxConcurrency, onProgress) => {
		const results = [];
		const executing = [];
		let completed = 0;

		for (let i = 0; i < tasks.length; i++) {
			const taskIndex = i;
			const promise = tasks[i]().then(result => {
				completed++;
				if (onProgress) onProgress(completed, tasks.length);
				return { index: taskIndex, result };
			});

			executing.push(promise);

			if (executing.length >= maxConcurrency) {
				const completed = await Promise.race(executing);
				const completedIndex = executing.findIndex(p => p === completed);
				executing.splice(completedIndex, 1);
				results.push(completed);
			}
		}

		// Wait for remaining tasks to complete
		const remaining = await Promise.all(executing);
		results.push(...remaining);

		// Sort results by original task index
		return results.sort((a, b) => a.index - b.index).map(r => r.result);
	},
	audioTrackSelectionPrompt: () => {
		return new Promise((resolve, reject) => {
			console.log(`Found ${fstro.audioTracksAll.length} Audio Track(s)`);
			if (fstro.videoTracks.length > 0) {
				console.log(`Found ${fstro.videoTracks.length} Video Track(s)`);
			}
			if (fstro.subtitleTracks.length > 0) {
				console.log(`Found ${fstro.subtitleTracks.length} Subtitle Track(s)`);
			}
			if (fstro.hasChapters) {
				console.log(`Found ${fstro.movieJSON.chapters.length} Chapter(s)`);
			}
			console.log();

			fstro.audioTracksAll.forEach(track => {
				console.log(`	ID:         ${track.id}`);
				console.log(`	Codec:      ${track.codec}`);
				console.log(`	Channels:   ${track.properties.audio_channels}`);
				console.log(`	Language:   ${track.properties.language}`);
				console.log(`	Track Name: ${track.properties.track_name}`);
				console.log(``);
			});

			const monoAudioIds = fstro.audioTracksMono.map(track => track.id);
			const audioTracksAllIds = fstro.audioTracksAll.map(track => track.id);

			// If --select-all-mono flag is used, automatically select all mono tracks
			if (fstro.selectAllMono) {
				fstro.selectedIds = [...new Set(monoAudioIds)].sort((a, b) => a - b);

				if (fstro.selectedIds.length === 0) {
					console.log(colors.red('Error: no mono tracks found'));
					reject('no mono tracks found');
					process.exit();
				}

				console.log(`Auto-selecting all mono tracks: ${fstro.selectedIds.join(',')}`);
				console.log('');
				resolve();
				return;
			}

			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.question(`Select IDs to process [${monoAudioIds.join(',')}]: `, (answer) => {
				rl.close();

				const ids = (answer.trim() === '') ? monoAudioIds : (answer.match(/(\d+)/g) || []).map(id => parseInt(id, 10));

				fstro.selectedIds = [...new Set(ids)].sort((a, b) => a - b).filter(n => audioTracksAllIds.indexOf(n) >= 0);

				if (fstro.selectedIds.length === 0) {
					console.log(colors.red('Error: no tracks selected'));
					reject('no tracks selected');
					process.exit();
				}

				console.log('');

				resolve();
			});
		});
	},
	makeTempDir: async () => {
		try {
			console.log(`Making temp path: ${tempPath}`);
			await mkdirp(tempPath);
		} catch (err) {
			console.log(colors.red(`Error: ${err}`));
			process.exit();
		}
	},
	mkvExtractMonoAudio: () => {
		return new Promise((resolve, reject) => {
			// mkvextract tracks mono_audio.mkv 1:mono.ac3
			console.log('');
			console.log('Extracting selected audio track(s).');
			let cmd = '';

			if (fstro.isMatroska) {
				cmd = `mkvextract tracks "${fstro.movieOriginal}"`;

				fstro.selectedIds.forEach(id => {
					const track = fstro.audioTracksAll.find(track => track.id === id);
					const ext   = Object.keys(codecIds).find(key => codecIds[key] === track.properties.codec_id);
					fstro.monoTracks.push(`${id}:${tempPath}/${id}.mono.${ext}`);
				});

				cmd = `${cmd} ${fstro.monoTracks.join(' ')}`;

				const progressBar = progressBars.create('Extracting Audio', 100);
				let progress = 0;
				const progressInterval = setInterval(() => {
					progress += Math.random() * 10;
					if (progress > 95) progress = 95;
					progressBar.update(Math.floor(progress));
				}, 200);

				exec(cmd, (err, out) => {
					clearInterval(progressInterval);
					progressBar.update(100);
					progressBars.stop();

					if (err) {
						console.log(colors.red(`Error: ${err}`));
						reject(err);
						return;
					}
					resolve();
				});
			} else {
				fstro.monoTracks.push(`1:${tempPath}/1.mono.aac`);
				cmd = `ffmpeg -y -hide_banner -nostats -loglevel 0 -i "${fstro.movieOriginal}" ${tempPath}/1.mono.aac`;

				const progressBar = progressBars.create('Extracting Audio', 100);
				let progress = 0;
				const progressInterval = setInterval(() => {
					progress += Math.random() * 8;
					if (progress > 95) progress = 95;
					progressBar.update(Math.floor(progress));
				}, 250);

				exec(cmd, (err, out) => {
					clearInterval(progressInterval);
					progressBar.update(100);
					progressBars.stop();

					if (err) {
						console.log(colors.red(`Error: ${err}`));
						reject(err);
						return;
					}
					console.log(out);
					resolve();
				});
			}
		});
	},
	mono2stereo: async () => {
		// ffmpeg -i mono.ac3 -ac 2 stereo.ac3
		console.log(`Converting mono audio to forced stereo (${fstro.maxConcurrency} concurrent processes).`);

		const totalTracks = fstro.monoTracks.length;
		const progressBar = progressBars.create('Converting to Stereo', totalTracks);
		const startTime = Date.now();

		// Create conversion tasks
		const conversionTasks = fstro.monoTracks.map((track, n) => {
			return () => new Promise((resolve, reject) => {
				const trackId = fstro.selectedIds[n];
				console.log(`→ Converting Track ${trackId}`);

				const cmd = `ffmpeg -y -hide_banner -nostats -loglevel 0 -i ${track.replace(/\d+:/,'')} -ac 2 ${tempPath}/${trackId}.stereo.aac`;
				const outputFile = `${trackId}.stereo.aac`;

				exec(cmd, (err, out) => {
					if (err) {
						reject(new Error(`Track ${trackId} conversion failed: ${err.message}`));
						return;
					}
					resolve(outputFile);
				});
			});
		});

		try {
			// Run conversions with concurrency control
			const results = await fstro.runWithConcurrency(
				conversionTasks,
				fstro.maxConcurrency,
				(completed, total) => {
					const elapsed = (Date.now() - startTime) / 1000;
					const avgTimePerTrack = elapsed / completed;
					const remaining = total - completed;
					const eta = remaining > 0 ? remaining * avgTimePerTrack : 0;

					progressBar.update(completed, {
						eta_formatted: remaining > 0 ? progressBars.formatTime(eta) : '0s'
					});
				}
			);

			// Update stereo tracks array with results
			fstro.stereoTracks = results;

			progressBars.stop();
			const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
			console.log(`\nCompleted ${totalTracks} track(s) in ${totalTime}s (avg: ${(totalTime / totalTracks).toFixed(1)}s per track)`);

		} catch (error) {
			progressBars.stop();
			console.log(colors.red(`Error during parallel conversion: ${error.message}`));
			throw error;
		}
	},
	buildMKV: () => {
		return new Promise((resolve, reject) => {
			console.log('');
			console.log(`Building: ${fstro.localPath}/${fstro.outputName}`)
			// mkvmerge -q -o forced_stereo.mkv original.mkv  \
			//   --language 0:swe  \
			//   --track-name "0:ForcedStereo (AAC)"  \
			//   --default-track 0:no  \
			//   --forced-track  0:no  \
			//    -D -S TEMP/1.stereo.aac \
			//   --language 0:eng  \
			//   --track-name "0:ForcedStereo (AAC) Commentary"  \
			//   --default-track 0:no  \
			//   --forced-track  0:no  \
			//    -D -S TEMP/2.stereo.aac

			// Build comprehensive mkvmerge command with full metadata preservation
			let cmd = `mkvmerge -q -o "${fstro.localPath}/${fstro.outputName}"`;

			// Copy all original tracks with metadata preservation (including chapters and attachments)
			cmd += ` "${fstro.movieOriginal}"`;

			// Log what will be preserved
			console.log(`Preserving ${fstro.videoTracks.length} video track(s)`);
			console.log(`Preserving ${fstro.audioTracksAll.length} original audio track(s)`);
			console.log(`Preserving ${fstro.subtitleTracks.length} subtitle track(s)`);
			if (fstro.hasChapters) {
				console.log(`Preserving ${fstro.movieJSON.chapters.length} chapter(s)`);
			}
			console.log(`Adding ${fstro.stereoTracks.length} forced stereo track(s)`);
			console.log();

			// Add new stereo tracks
			fstro.stereoTracks.forEach((audioTrack, n) => {
				const refTrack = fstro.audioTracksAll.find(track => track.id === fstro.selectedIds[n]);
				const trackName = fstro.formatTrackName(fstro.trackNameTemplate, refTrack);

				cmd += ` --language 0:${refTrack.properties.language || 'und'}`;
				cmd += ` --track-name "0:${trackName}"`;
				cmd += ` --default-track 0:no`;
				cmd += ` --forced-track 0:no`;
				cmd += ` "${tempPath}/${audioTrack}"`;

				console.log(`→ Adding stereo track: "${trackName}"`);
			});
			console.log();

			const progressBar = progressBars.create('Building MKV', 100);
			let progress = 0;
			const startTime = Date.now();
			const progressInterval = setInterval(() => {
				progress += Math.random() * 5;
				if (progress > 95) progress = 95;
				progressBar.update(Math.floor(progress));
			}, 300);

			exec(cmd, (err, out) => {
				clearInterval(progressInterval);
				progressBar.update(100);
				progressBars.stop();

				const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
				console.log(`\nMKV built in ${totalTime}s`);

				if (err) {
					console.log(colors.red(`Error: ${err}`));
					reject(err);
					return;
				}
				resolve();
			});
		});
	},
	cleanUp: () => {
		return new Promise((resolve, reject) => {
			console.log('');
			console.log('Cleaning up my garbage.');
			const cmd = `rm -rf ${tempPath}`;

			exec(cmd, (err, out) => {
				if (err) {
					console.log('Error: ',err);
					reject(err);
					return;
				}
				resolve();
			});
		});
	},
	done: () => {
		console.log('');
		console.log('Done!');
		console.log('');
		console.log('Verify With:');
		console.log(`mkvinfo ${fstro.localPath}/${fstro.outputName}`);
		console.log('');
		console.log('');
		process.exit();
	}
};

const codecIds = {
	'ac3'    : 'A_AC3',
	'eac3'   : 'A_EAC3',
	'mp2'    : 'A_MPEG/L2',
	'mp3'    : 'A_MPEG/L3',
	'dts'    : 'A_DTS',
	'wav'    : 'A_PCM/INT/LIT',
	'wav'    : 'A_PCM/INT/BIG',
	'flac'   : 'A_FLAC',
	'caf'    : 'A_ALAC',
	'oga'    : 'A_VORBIS',
	'opus'   : 'A_OPUS',
	'aac'    : 'A_AAC',
	'ra'     : 'A_REAL/',
	'mlp'    : 'A_MLP',
	'thd'    : 'A_TRUEHD',
	'tta'    : 'A_TTA1',
	'wv'     : 'A_WAVPACK4',
	'avi'    : 'V_MS/VFW/FOURCC',
	'h264'   : 'V_MPEG4/ISO/AVC',
	'h265'   : 'V_MPEGH/ISO/HEVC',
	'rv'     : 'V_REAL/',
	'm1v'    : 'V_MPEG1',
	'm2v'    : 'V_MPEG2',
	'ogv'    : 'V_THEORA',
	'ivf'    : 'V_VP8',
	'ivf'    : 'V_VP9',
	'srt'    : 'S_TEXT/UTF8',
	'srt'    : 'S_TEXT/ASCII',
	'ssa'    : 'S_TEXT/SSA',
	'ass'    : 'S_TEXT/ASS',
	'ssa'    : 'S_SSA',
	'ass'    : 'S_ASS',
	'sub'    : 'S_VOBSUB',
	'usf'    : 'S_TEXT/USF',
	'ogx'    : 'S_KATE',
	'sup'    : 'S_HDMV/PGS',
	'textst' : 'S_HDMV/TEXTST',
	'vtt'    : 'S_TEXT/WEBVTT'
}

fstro.init();

