/**
 * Copyright 2022 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 module.exports = function(RED) {
    var settings = RED.settings;
    const os = require('node:os');
    const Pipe2Jpeg = require('pipe2jpeg');
    const { exec, spawn, ChildProcess } = require('child_process');
    
    function RtspClientNode(config) {
        RED.nodes.createNode(this, config);
        this.ffmpegPath         = config.ffmpegPath.trim();
        this.rtspUrl            = config.rtspUrl;
        this.statisticsPeriod   = config.statisticsPeriod;
        this.restartPeriod      = config.restartPeriod;
        this.autoStart          = config.autoStart;
        this.videoFrameRate     = config.videoFrameRate;
	    this.videoWidth         = config.videoWidth;
        this.videoHeight        = config.videoHeight;
        this.videoQuality       = config.videoQuality;
        this.minFragDuration    = config.minFragDuration;
        this.videoCodec         = config.videoCodec;
        this.audioCodec         = config.audioCodec;
        this.audioSampleRate    = config.audioSampleRate;
        this.audioBitRate       = config.audioBitRate;
        this.transportProtocol  = config.transportProtocol;
        this.imageSource         = config.imageSource;
        this.imageFrameRate      = config.imageFrameRate;
        this.imageWidth          = config.imageWidth;
        this.imageHeight         = config.imageHeight;
        this.socketTimeout      = config.socketTimeout;
        this.maximumDelay       = config.maximumDelay;
        this.socketBufferSize   = config.socketBufferSize;
        this.reorderQueueSize   = config.reorderQueueSize;
        this.ffmpegProcess      = null;
        this.processStatus      = "STOPPED";
        this.jpegChunks         = [];
        this.restartPolicy      = 'DISABLE';
        
        var node = this;
        
        node.status({ fill: 'blue', shape: 'dot', text: "stopped" });
        
        // Insert the credentials into the rtsp url for basic authentication.
        if(node.credentials.userName && node.credentials.password) {
            this.rtspUrl = this.rtspUrl.replace('rtsp://', 'rtsp://' + node.credentials.userName + ':' + node.credentials.password + '@');
        }
        
        if(node.autoStart === "enable") {
            startFFmpegProcess(null);
        }

        function startFFmpegProcess(msg) {
            if (node.processStatus === "RUNNING") {
                node.warn("the child process is already started");
                // No need to stop the process
                return;
            }

            let ffmpegCmdArgs = [];
            
            // ----------------------------------------------------------------------------------------------
            // Input (stream) options
            // ----------------------------------------------------------------------------------------------

            // Send only error data on stderr
            ffmpegCmdArgs = ffmpegCmdArgs.concat(['-loglevel', '+level+fatal']);

            // Make sure the progress is clear and parsable (see https://superuser.com/a/1460400)
            ffmpegCmdArgs = ffmpegCmdArgs.concat(['-nostats']);

            // The format of the input stream should be rtsp
            ffmpegCmdArgs = ffmpegCmdArgs.concat(['-f', 'rtsp']);

            if(node.transportProtocol == 'prefer_tcp') {
                // Try TCP first and automatically fallback to UDP if it fails
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-rtsp_transport', 'tcp']);
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-rtsp_flags', 'prefer_tcp']);
            }
            else {
                // When we wouldn't specify a transport protocol, ffmpeg would use UDP by default.
                // Transport protocol HTTP can be used for tunnelling over HTTP through proxies.
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-rtsp_transport', node.transportProtocol]);
            }

            if(node.socketTimeout) {
                // Set the (TP) socket I/O timeout in microseconds
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-stimeout', node.socketTimeout]);
            }

            if(node.maximumDelay) {
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-max_delay', node.maximumDelay]);
            }

            if(node.socketBufferSize) {
                // Set the maximum UDP socket receive buffer size in bytes.  The default size is 384 KB.
                // This buffer size can have effect on image smearing (see https://github.com/ZoneMinder/zoneminder/issues/811).
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-buffer_size', node.socketBufferSize]);
            }

            if(node.reorderQueueSize) {
                // This queue is only relevant when using UDP:
                // When receiving data over UDP, packets may arrive out of order or may get lost totally.
                // Therefore the demuxer tries to reorder the received packets, by storing the packets temporarily into the re-order queue.
                // When the queue size is too small, artifacts will start appearing on the images.
                // Then change the size of this quue, by specifying the number of packets to handle.  The default size of this jitter buffer is 500.
                // Caution: higher values will result in greater latency.
                // Note that the reorder queue can be disabled completely by setting the max_delay to 0.
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-reorder_queue_size', node.reorderQueueSize]);
            }

            ffmpegCmdArgs = ffmpegCmdArgs.concat(['-i', node.rtspUrl]);

            // ----------------------------------------------------------------------------------------------
            // Output 'mp4' (pipe 1) options
            // ----------------------------------------------------------------------------------------------

            // Mux the rtsp audio and video content into an mp4 container (which can be played by a browser)
            ffmpegCmdArgs = ffmpegCmdArgs.concat(['-f', 'mp4']);

            if(node.audioCodec === "none") {
                // Disable audio
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-an']);
            }
            else {
                // A typical audio re-encoding case is to AAC, so browsers can play the audio?
                // Note that "-acodec" is the same as "-codec:a" or "-c:a"
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-c:a', node.audioCodec]);

                if(node.audioSampleRate) {
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-ar', node.audioSampleRate]); // e.g. 44100
                }

                if(node.audioBitRate) {
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-b:a', node.audioBitRate]); // e.g. 96K
                }

                //if(node.audioChannelCount) {
                //    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-ac', node.audioChannelCount]); // e.g. 96K
                //}
            }

            if(node.videoCodec === "none") {
                // Disable video
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-vn']);
            }
            else {
                // In case of a h264_mmal codec, an extra argument should be supplied
                if(node.videoCodec === "h264_mmal") {
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-hwaccel', 'rpi']);
                }

                // Note that "-vcodec" is the same as "-codec:v" or "-c:v"
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-c:v', node.videoCodec]);

                if(node.videoWidth && node.videoHeight) { // resolution
                    // Note that "-video_size" is the same as "-s"
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-s', node.videoWidth + 'x' + node.videoHeight]);
                }

                if(node.videoFrameRate) {
                    // Note that "-framerate" is the same as "-r"
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-r', node.videoFrameRate]);
                }

                if(node.videoBitRate) {
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-b:v', node.videoBitRate]); // e.g. 500K
                }                    

                if(node.videoQuality) {
                    // A low videoQuality factor means good videoQuality, resulting in higher bitrate.
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-q:v', node.videoQuality]);
                }

                // MP4 muxer options:
                //  - frag_keyframe : start fragment at video keyframes (less performance overhead compared to frag_every_frame)
                //  - frag_every_frame: start fragment at every frame
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-movflags', '+frag_keyframe+empty_moov+default_base_moof']);
            
                if(node.minFragDuration) {
                    // The minimum duration of fragments (in milliseconds)
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-min_frag_duration', node.minFragDuration]);
                }
            }

            ffmpegCmdArgs = ffmpegCmdArgs.concat(['pipe:1']); // stdout

            // ----------------------------------------------------------------------------------------------
            // Output 'progress' (pipe 3) options
            // ----------------------------------------------------------------------------------------------

            // Only output statistic values when a statistics period (in seconds) has been specified
            if(node.statisticsPeriod) {
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-stats_period', node.statisticsPeriod]);

                // Progress information is written periodically and at the end of the encoding process.
                // It is made of "key=value" lines. key consists of only alphanumeric characters.
                // The last key of a sequence of progress information is always "progress".
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-progress']);
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['pipe:3']); // first additional pipe
            }
            
            // ----------------------------------------------------------------------------------------------
            // Output 'jpeg' (pipe 4) options
            // ----------------------------------------------------------------------------------------------

            if(node.imageSource == 'all_frames') { // This will consume a lot of CPU due to decoding the H.264 to Jpeg images
                // Send the output to a pipe (instead of to a file) to do everything in-memory 
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-f', 'image2pipe']);
                // Instruct image2pipe to create individual images
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-c', 'mjpeg']);
                // Filtergraph containing an fps filter to give an output of 4 frames per second.
                // If the input FR drops below the CFR output, the 'fps' filter will repeat input frames in order to maintain CFR output.  
                // It is also possible to specify fractions (e.g. fps=fps=1/2).
                // Note that vf is the same as -filter:v
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-vf', 'fps=fps=4']);
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['pipe:4']);
            }
            else if(node.imageSource == 'i_frames') {
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-f', 'image2pipe']); // Send the output to a pipe (instead of to a file) to do everything in-memory 
                // TODO adjustable frame rate (select='eq(pict_type,PICT_TYPE_I)',scale=trunc(iw/4):-2)
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-vf', "select='eq(pict_type,PICT_TYPE_I)'"]);// Filtergraph to extract the I frames (= keyframes that contain all the data necessary for the image and are not interpolated), and dynamic scaling for 75 percent of the original input width and having the width and height divisible by 2 and keeping the aspect ratioCFR output.
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['-vsync', 'vfr']); // use variable frame rate to make sure the timestamps (of the extracted I frames) are still ok
            }

            if(node.imageSource == 'all_frames' || node.imageSource == 'i_frames') {
                if(node.imageWidth && node.imageHeight) { // resolution
                    // Note that "-video_size" is the same as "-s"
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-s', node.imageWidth + 'x' + node.imageHeight]);
                }
                if(node.imageFrameRate) {
                    // Note that "-framerate" is the same as "-r"
                    ffmpegCmdArgs = ffmpegCmdArgs.concat(['-r', node.imageFrameRate]);
                }
                ffmpegCmdArgs = ffmpegCmdArgs.concat(['pipe:4']);
            }

            // By default the FFmpeg child process gets the same environment variables as this node's parent process (i.e. the 
            // OS environment variables available in process.env).  However some extra environment variables can be specified,
            // which will be added to the (cloned) default variables.  These environment variables can be used to configure FFMPEG, e.g. to pass secrets.
            let additionalEnv = [];
            let allEnv = Object.assign(process.env, additionalEnv);
            
            // We will define two additional output pipes, next to the existing pipes.  Which means will we end up with 5 pipes in total: stdin, stdout, stderr, progress, jpeg.
            // When FFmpeg writes output data to an output pipe and the OS limit is exceeded, then the child process will start waiting for the pipe buffer to accept more data.
            // As a result when that pipe data wouldn't be consumed by this node, the child process would wait infinite and thus become unresponsive.
            // That can be resolved by telling the subprocess to ignore the stdout (i.e. writing to /dev/null instead of /dev/stdout) via stdio='ignore'
            // Since we will listen to all output pipes, the array containing all 'stdio' properties of all 5 pipes will be 'pipe' instead of 'ignore' (because we will listen to all pipes)
            let pipes = [{
                name: 'stdin',
                stdio: 'pipe'
            },
            {
                name: 'stdout',
                stdio: 'pipe'
            },
            {
                name: 'stderr',
                stdio: 'pipe'
            },
            {
                name: 'progress_pipe',
                stdio: 'pipe'
            },
            {
                name: 'jpeg_pipe',
                stdio: 'pipe'
            }];
            
            // Create an array containing all 'stdio' properties of all specified pipes
            let stdio = pipes.map(pipe => pipe.stdio);

            try {
                // Spawn FFmpeg as a child process for the specified command.
                // The options.stdio option is used to configure the pipes that are established between the parent and child process.
                node.ffmpegProcess = spawn(node.ffmpegPath, ffmpegCmdArgs, { stdio, allEnv });
            }
            catch(err){
                node.error("exception: " + err);
                node.ffmpegProcess = null;
                return;
            }

            node.ffmpegProcess.on('error', function(err) {
                if (err.code === 'ENOENT') {
                    error.message = "Cannot find FFMpeg executable.";
                }
                
                node.error("child process error: " + err, msg);
                node.status({ fill: 'red', shape: 'dot', text: err.toString() });
                node.send([null, { topic: 'process error', payload: err.toString() }, null, null]);
            });
            
            node.ffmpegProcess.on('uncaughtException', function (err) {
                node.error("child process uncaucht error: " + err, msg);
                node.status({ fill: 'red', shape: 'dot', text: err.toString() });
                node.send([null, { topic: 'uncaught process error', payload: err.toString() }, null, null]);
            });
            
            // If the child process fails to spawn due to errors, then the pid is undefined (and an error event is emitted).
            if (!node.ffmpegProcess.pid) {
                node.ffmpegProcess = null;
                return;
            }
            
            node.ffmpegProcess.on('close', function(code, signal) {
                node.debug("child process closed", msg);
                node.processStatus = "STOPPED";
                node.status({ fill: 'blue', shape: 'dot', text: "stopped" });
                node.send([null, { topic: 'stopped', payload: node.ffmpegProcess.pid }, null, null]);
                // If there is a timer running (to kill the subprocess), then remove it because the process seems to have stopped already gracefully
                if(node.sigkillTimeout) {
                    clearTimeout(node.sigkillTimeout);
                }
                node.ffmpegProcess = null;
                
                // When there is a previous restart timer running, then stop it (to avoid having multiple timers running in parallel)
                if(node.restartTimeout) {
                    clearTimeout(node.restartTimeout);
                }
                
                switch(node.restartPolicy) {
                    case 'AFTER_PERIOD':
                        node.restartTimeout = setTimeout(function() {
                            startFFmpegProcess(null);
                            node.restartTimeout = null;
                        }, node.restartPeriod * 1000);
                        break;
                    case 'IMMEDIATE':
                        startFFmpegProcess(null);
                        break;
                    case 'DISABLE':
                        // No need to restart anything
                        break;
                    default:
                        console.log('Unknown autostart policy: ' + node.restartPolicy);
                }
            });
            
            // By registering to stdin errors, we can avoid uncatchable errors being thrown when the child process is abruptly closed during a large write operation
            node.ffmpegProcess.stdin.on('error', function(err) {
                node.error("stdin error: " + err, msg);
            });

            // Try to terminate the FFmpeg subprocess gently 
            node.ffmpegProcess.stdin.on('close', function() {
                node.debug("stdin closed", msg);
                
                if(node.ffmpegProcess) {
                    // When the stdin pipe is closed explicit via an input message, we need to terminate the corresponding
                    // child process instance gracefully (via SIGTERM)
                    node.ffmpegProcess.stdin.removeAllListeners('error');
                    if (node.ffmpegProcess instanceof ChildProcess && node.ffmpegProcess.kill(0)) {
                        node.processStatus === "TERMINATING";
                        node.ffmpegProcess.kill('SIGTERM');
                    }
                }
                else {
                    // When the ffmpeg command terminates abruptly, the stdin pipe will also be stopped.
                    // Since the subprocess is already terminated, we don't need to do that here anymore.
                    // This happens a.o. due to incorrect ffmpeg command arguments (e.g. "... -irtsp..." instead of "...-i rtsp...").
                    // Not sure why the process 'error' or 'uncaughtException' events are triggered in that case.
                    // TODO perhaps show an error here, because it was an unexpected condition!!
                }
            });
            
            
            // Listen for the events on all output pipes (so not on stdin which has already been handled above)
            for (let i = 1; i < pipes.length; ++i) {
                let pipeSocket = node.ffmpegProcess.stdio[i];

                pipeSocket.on('error', function(err) {
                    node.error("pipe " + i + " (" + pipes[i].name + ") error: " + err, msg);
                });

                pipeSocket.on('close', function() {
                    node.debug("pipe " + i + " (" + pipes[i].name + ") closed: ", msg);
                    pipeSocket.removeAllListeners('data');
                    pipeSocket.removeAllListeners('error');
                });
            }
            

            // Handle the data arriving on pipe 1 (which is the standard stdout).
            // This data might be only chunks of an mp4 segment, if the mp4 segments are larger than the OS pipe buffer size.
            let pipe1Socket = node.ffmpegProcess.stdio[1];
            pipe1Socket.on('data', function(data) {
                if (data.length > 1) {
                    node.send([{payload: data}, null, null, null]);
                }
            });
            
            // Handle the data arriving on pipe 2 (which is the standard stderr)
            let pipe2Socket = node.ffmpegProcess.stdio[2];
            pipe2Socket.on('data', function(data) {
                if (data.length > 1) {
                    if(Buffer.isBuffer(data)) {
                        data = data.toString();
                    }
                    node.send([null, {topic: "error", payload: data}, null, null]);
                }
            });
            
            // Handle the data arriving on pipe 3 (which is an additional output pipe to retrieve progress information)
            let pipe3Socket = node.ffmpegProcess.stdio[3];
            pipe3Socket.on('data', function(data) {
                if (data.length > 1) {
                    try {
                        // The data contains progress information as a buffer, with following content (after string conversion):
                        // "frame=5\nfps=0.00\nstream_0_0_q=-1.0\nstream_1_0_q=6.3\nbitrate=  41.3kbits/s\n..."
                        let progressInfo = JSON.parse('{"' + data.toString().trim().replace(/\r\n?|\n/g, '","').replace(/\s/g, '').replaceAll('=', '": "') + '"}');
                        
                        node.send([null, null, {payload: progressInfo}, null]);
                    }
                    catch(err) {
                        node.error("pipe 3 (" + pipes[3].name + ") json parse error: " + err, msg);
                    }
                }
            });
            
            // Handle the data arriving on pipe 4 (which is an additional output pipe to retrieve jpeg images)
            let pipe4Socket = node.ffmpegProcess.stdio[4];
            pipe4Socket.on('data', function(data) {
                if (data.length > 1) {
                    if(data[0] == 0xff && data[1] == 0xd8 && data[data.length -2 ] == 0xff && data[data.length - 1] == 0xd9) {
                        // The data buffer starts with ffd8 and ends with ffd9, which means it represents 1 complete jpeg image.
                        // In this case it is not useful to use pipe2jpeg, because it will search through the entire buffer to find
                        // the ffd8 and ffd9 sequences (which means we would waste a lot of system resources).
                        node.send([null, null, null, {payload: data}]);
                    }
                    else {
                        // An image can be composed of one or multiple chunk when receiving stream data.
                        // Indeed the ffmpeg's pipe2image produces images which will be feed into Node-RED via a pipe.
                        // However the pipe buffer is limited by OS constraints, e.g. 65 Kbyte on a Raspberry Pi.
                        // When an individual jpeg size exceeds the OS buffer limitation, the image is splitted into chunks.
                        // Therefore we will join the chunks together again to recreate the images from the chunks.
                        if(!node.pipe2jpeg) {
                            node.pipe2jpeg = new Pipe2Jpeg();
                            
                            node.pipe2jpeg.on('jpeg', function(jpeg) {
                               node.send([null, null, null, {payload: jpeg}]);
                            })

                            node.pipe2jpeg.on('error', function(err) {
                                node.error("error in pipe to jpeg: " + err);
                            })
                        }
                        
                        node.pipe2jpeg.write(data);
                    }
                }
            });

            node.processStatus = "RUNNING";
            node.status({ fill: 'blue', shape: 'dot', text: "running (pid " + node.ffmpegProcess.pid + ")" });
            node.send([null, {
                topic: 'started',
                payload: {
                    pid: node.ffmpegProcess.pid,
                    arguments: ffmpegCmdArgs
                }
            }, null, null]);
        }

        // Kill the FFmpeg subproces gently like this:
        // 1.- End the subprocess stdin, to make sure all data is being flushed to the subprocess (to avoid having incomplete chunks).
        // 2.- When the stdin has closed, try to terminate the FFmpeg subprocess gently (via SIGTERM).
        //     For example to allow FFMpeg to finalize the current mp4 video, so it will be playable.
        // 3.- When the FFmpeg subprocess hasn't terminated gently after 2 seconds, we will kill it.
        // 4.- As soon as the FFmpeg subprocess has closed, we will do some cleanup in this node.
        function stopFFmpegProcess(msg) {
            if(node.processStatus !== "RUNNING") {
                node.warn("no process running yet");
                // No need to stop the process
                return;
            }

            // See the meaning of all exit codes (set by the child process): https://nodejs.org/api/process.html#process_exit_codes  
            if (node.ffmpegProcess.exitCode || node.ffmpegProcess.signalCode) {
                node.warn("signal being processed already");
                // Seems there is already a signal being processed at the moment
                return;
            }
            
            // When the application in the subprocess has refused to terminate (after the SIGTERM signal), we will force to kill it after 2 seconds
            node.sigkillTimeout = setTimeout(function() {
                node.warn("killing timeout", msg);
                node.debug(`sigkill timeout`);
                if (node.ffmpegProcess instanceof ChildProcess && node.ffmpegProcess.kill(0)) {
                    node.processStatus === "KILLING";
                    node.ffmpegProcess.kill('SIGKILL');
                }
            }, 2000);

            node.processStatus === "STOPPING";
            
            node.debug("stop stdin");

            // End the stdin of the FFmpeg process to flush the data it contains
            node.ffmpegProcess.stdin.end();
        }

        node.on('input', function(msg/*, send, done*/) {
            if (node.processStatus === "STOPPING") {
                node.warn("The FFmpeg subprocess is stopping currently");
                return;
            }

            try {
                switch (msg.topic) {
                    case 'start':
                        startFFmpegProcess(msg);
                        
                        // When the child process has been explicit asked to start and it stops unexpectedly afterwards, it will 
                        // need to restart automatically (if a restart period has been specified in the config screen)
                        node.restartPolicy = 'AFTER_PERIOD';
                        break;
                    case 'stop':
                        stopFFmpegProcess(msg);
                        
                        // Since there is an explicit request to stop the ffmpeg child process, it is not allowed to automatically restart it again
                        node.restartPolicy = 'DISABLE';
                        break;
                    case 'restart':
                        stopFFmpegProcess(msg);
                        
                        // We will need to wait until the FFmpeg process has been stopped (or killed), and only then the FFmpeg child process can be started again
                        node.restartPolicy = 'IMMEDIATE';
                        break;
                    case "version":
                        exec(node.ffmpegPath + ' -version', (error, stdout, stderr) => {
                            if (error) {
                                node.warn(`error: ${error.message}`);
                                return;
                            }
                            if (stderr) {
                                node.warn(`stderr: ${stderr}`);
                                return;
                            }
                            
                            let versionInfo = stdout.replace(/\r\n?|\n/g, '\n').split('\n');
                            node.debug(versionInfo);
                            
                            // Extract the ffmpeg version number from the long string
                            //let ffmpegVersion = versionInfo.match(/ffmpeg version ([^ ]*) /)[1];

                            node.send([null, { topic: "ffmpeg_version", payload: versionInfo}, null, null]);
                        });
                        break;
                    case "demuxers":
                    case "decoders":
                    case "muxers":
                    case "encoders":
                    case "filters":
                    case "hwaccels":
                        exec(node.ffmpegPath + ' -hide_banner -' + msg.topic, (error, stdout, stderr) => {
                            // Ignore the stderr, because it seems to contain the ffmpeg version info...
                            if (error) {
                                node.warn(`error: ${error.message}`);
                                return;
                            }
                            
                            let info = stdout.replace(/\r\n?|\n/g, '\n').split('\n');
                            
                            // When a payload contains a regex string, then only keep elements that match that regex
                            if(msg.payload && (typeof msg.payload === 'string' || msg.payload instanceof String)) {
                                const caseInsensitiveRegex = new RegExp(msg.payload, 'i');
                                
                                info = info.filter(element => {
                                    return caseInsensitiveRegex.test(element);
                                    return element.toLowerCase().includes(msg.payload.toLowerCase());
                                });
                            }

                            node.send([null, { topic: "ffmpeg_" + msg.topic, payload: info}, null, null]);
                        });
                        break;
                    case "probe":
                        // The ffprobe.exe is located in the same directory as ffmpeg.exe
                        const ffprobePath = node.ffmpegPath.replace('ffmpeg.exe', 'ffprobe.exe');
                       
                        exec(ffprobePath + ' -hide_banner -i "' + node.rtspUrl + '"', (error, stdout, stderr) => {
                            if (error) {
                                node.warn(`error: ${error.message}`);
                                return;
                            }
                            
                            // Seems that this kind of output is send by ffprobe to stderr (instead of stdout).
                            // See https://trac.ffmpeg.org/ticket/5880
                            let probeOutput = stderr;
                            node.debug(probeOutput);

                            node.send([null, { topic: "ffprobe", payload: probeOutput}, null, null]);
                        });
                        break;
                    default:
                        node.error('msg.topic contains an unsupported action', msg);
                }
            }
            catch(err) {
                node.error(err);
                node.send([null, { topic: 'node error', payload: err }, null, null]);
            }

            if(!msg.topic) {
                // No topic required when feeding buffer data into ffmpeg (to keep flow simple)
                if(node.processStatus !== "RUNNING") {
                    node.error("When no msg.topic is supplied, the FFmpeg process should be running", msg);
                }
                else {
                    if (!Buffer.isBuffer(msg.payload) || msg.payload.length == 0) {
                        node.error("When no msg.topic is supplied, the msg.payload should contain a non-empty buffer", msg);
                    }
                    else {
                        try {
                            node.ffmpegProcess.stdin.write(msg.payload);
                        }
                        catch (err) {
                            node.error("Error while feeding input buffer to the FFmpeg process: " + err, msg);
                        }
                    }
                }
            }

            if(node.processStatus === "RUNNING" && Buffer.isBuffer(msg.payload) && msg.payload.length > 0) {
                node.ffmpegProcess.stdin.write(msg.payload);
            }
        });

        node.on('close', function(/*removed, done*/) {
            // Make sure the current running process is ended
            stopFFmpegProcess(null);

            if (removed) {
                // This node has been disabled/deleted
            }
            else {
                // This node is being restarted
            }
            done();
        });
    }

    RED.nodes.registerType("rtsp-client", RtspClientNode, {
        credentials: {
            userName: {type:"text"},
            password: {type: "password"}
        }
    });
}
