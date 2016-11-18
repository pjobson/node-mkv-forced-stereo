#!/usr/bin/env node

'use strict';

const Q         = require('q');                  // https://github.com/kriskowal/q
const fs        = require('fs');
const exec      = require('child_process').exec; // https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback

let file = {
	path:  false,
	movie: {
		original:    false,
		noAudio:     false,
		stereoAudio: false
	},
	audio: {
		trackId:   false,
		monoAC3:   false,
		stereoAC3: false
	}
};

const fstro = {
	init: function() {
		if (process.argv.length !==3) {
			console.log('missing file name');
			process.exit();
		}
		
		if (!fstro.fileTest(process.argv[2])) {
			console.log('Looks like '+ process.argv[2] +' is not a file.');
			process.exit();
		}

		fstro.genFileNames(process.argv[2]);
		fstro.mkvIdentify()
			.then(fstro.mkvExtractMonoAudio)
			.then(fstro.mkvOutputNoAudio)
			.then(fstro.mono2stereo)
			.then(fstro.rebuildMkv)
			.then(fstro.moveMKV)
			.then(fstro.cleanUp);
		
	},
	fileTest: function(fname) {
		console.log('Testing file.');
		let stats = fs.lstatSync(fname);
		return stats.isFile();	
	},
	genFileNames: function(fname) {
		console.log('Generating file names.');
		file.path              = process.argv[2].match(/(.+)\/(.+)$/)[1];
		file.movie.original    = process.argv[2].match(/(.+)\/(.+)$/)[2];
		file.movie.noAudio     = 'no_audio.mkv';
		file.movie.stereoAudio = 'forced_stereo.mkv';
		file.audio.monoAC3     = 'mono.ac3';
		file.audio.stereoAC3   = 'stereo.ac3';
	},
	mkvIdentify: function() {
		let deferred = Q.defer();
		// mkvmerge -i mono_audio.mkv
		console.log('Identifying MKV file.');
		let cmd = 'mkvmerge -i '+ file.path+'/'+file.movie.original;
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			file.audio.trackId = out.match(/Track ID (\d+): audio/)[1];
			deferred.resolve();
		});
		return deferred.promise;
	},
	mkvExtractMonoAudio: function() {
		let deferred = Q.defer();
		// mkvextract tracks mono_audio.mkv 1:mono.ac3
		console.log('Extracting mono audio file from MKV.');
		let cmd = 'mkvextract tracks '+ file.path+'/'+file.movie.original +' '+ file.audio.trackId +':/tmp/'+ file.audio.monoAC3;
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();	
		});
		return deferred.promise;	
	},
	mkvOutputNoAudio: function() {
		let deferred = Q.defer();
		// mkvmerge -o no_audio.mkv --no-audio mono_audio.mkv
		console.log('Making no audio MKV.');
		let cmd = 'mkvmerge -q -o /tmp/'+ file.movie.noAudio +' --no-audio '+ file.path +'/'+ file.movie.original;
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	},
	mono2stereo: function() {
		let deferred = Q.defer();
		// ffmpeg -i mono.ac3 -ac 2 stereo.ac3
		console.log('Converting mono audio to forced stereo.');
		let cmd = 'ffmpeg -y -hide_banner -nostats -loglevel 0 -i /tmp/'+ file.audio.monoAC3 +' -ac 2 /tmp/'+ file.audio.stereoAC3;
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	},
	rebuildMkv: function() {
		let deferred = Q.defer();
		/*
		mkvmerge \
		     -o stereo_audio.mkv \
		     --language 0:eng \
		     --track-name "0:2-Forced Stereo (AC3)" \
		     --default-track 0:no \
		     --forced-track  0:yes \
		     -a 0 -D -S stereo.ac3 \
		     no_audio.mkv
		*/
		console.log('Rebuilding MKV file.');
		let cmd  = 'mkvmerge';
		    cmd += ' -q';
		    cmd += ' -o /tmp/'+ file.movie.stereoAudio;
		    cmd += ' --language 0:eng';
		    cmd += ' --track-name "0:2-Forced Stereo (AC3)"';
		    cmd += ' --default-track 0:no';
		    cmd += ' --forced-track  0:yes';
		    cmd += ' -a 0 -D -S /tmp/'+ file.audio.stereoAC3;
		    cmd += ' /tmp/'+ file.movie.noAudio;
		
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	},
	moveMKV: function() {
		let deferred = Q.defer();
		// move rebuilt mkv from temp
		console.log('Moving rebuilt MKV file to '+ file.path +'.');
		let cmd = 'mv /tmp/'+ file.movie.stereoAudio +' '+ file.path +'/'+ file.movie.stereoAudio;
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	},
	cleanUp: function() {
		let deferred = Q.defer();
		// move rebuilt mkv from temp
		// rm stuff
		console.log('Debug: Removing temp files.');
		let cmd  = 'rm';
		    cmd += ' /tmp/'+ file.movie.noAudio;
		    cmd += ' /tmp/'+ file.audio.monoAC3;
		    cmd += ' /tmp/'+ file.audio.stereoAC3; 
		exec(cmd, function(err, out, code) {
			if (err) {
				console.log('Error: ',err);
				deferred.reject(err);
			}
			deferred.resolve();
		});
		return deferred.promise;
	}
};

fstro.init();

