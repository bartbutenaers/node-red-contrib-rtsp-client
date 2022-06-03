# node-red-contrib-rtsp-client
A Node-RED node that acts as an RTSP client (via Ffmpeg)

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-rtsp-client
```

***PREREQUISITE: FFmpeg needs to be installed on your system before you can use this node!!!!***

## Support my Node-RED developments
Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Introduction

### RTSP basics
RTSP (Real-Time Streaming Protocol) is an application layer protocol designed for telecommunications and entertainment systems to control the delivery of multimedia data. While RTSP was originally intended to be used to deliver entertainment television, it is now mainly used in IP cameras.  RTSP can be compared to a TV remote control, because it can start/pause/stop the video and audio streams from the IP camera.

![RTSP protocol](https://user-images.githubusercontent.com/14224149/171836791-53dac8ed-e82c-4cd5-8aeb-aa752cbf05c7.png)

Since [FFmpeg](https://ffmpeg.org/ffmpeg.html) contains everything we need (RTSP demuxer, decoders, ...), this node will start FFmpeg in a child process as RTSP client.  By running FFmpeg in a child process, we avoid that the main Node-RED process becomes unresponsive (unless you hardware resources are not sufficient to handle all these computations of course...).

### Use cases
This node can be used to capture audio and video streams from your IP camera in your Node-RED flow.  Which means that the audio and video segments will arrive in your Node-RED flow, so these segments can be used for all kind of stuff:

+ Grab JPEG images from your stream to do image processing in the Node-Red flow (i.e. face recognition, object detection, license plate recognition, ...).

+ Convert the audio and video segments to a fragemented MP4 stream, because browsers cannot play directly RTSP streams:

   ![image](https://user-images.githubusercontent.com/14224149/171839987-ab04d48d-04ba-4e6a-85fb-3e413baf6651.png)

## Usage



-hwaccel rpi -c:v h264_mmal   (This uses the gpu for decoding, but there is no hwaccel for encoding the jpeg, so that is still done on the cpu.)
             One thing to mention about hardware acceleration decoding is that there is a limit on the size input of the video W x H. I think most cannot handle an input greater that 1080p and unfortunately ffmpeg will fail without giving a good error to describe the problem.  Gpu decoding is even trickier. Not all vf filters work with it, such as that pict type I thing
             
you will not be able to use -c:v copy unless the video input is already encoded as h264.

-metadata "title=hello bart
-vf drawtext=text='%{localtime\\:%a %b %d %Y %H꞉%M꞉%S}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=120:fontcolor=black:box=1:boxborderw=10:boxcolor=white@0.5

https://trac.ffmpeg.org/wiki/StreamingGuide



Shorten the segments to reduce the delay:
https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/130?u=bartbutenaers
Watch out: using these artificially smaller segment durations, they may not contain an iframe. So, the video in the browser seems to take an extra couple seconds to start playing (I suspect the media source in the browser needs enough video possibly including the iframe before it knows what to do with it), but then seems to keep up close to real time video playback.
I also noticed a higher cpu load when using smaller segments. Previously, my server side was processing about 1 segment every 2 seconds. Now, it is processing 2 segments every second, which is a rate increase x 4

You are trying to stream jpegs, not mp4, for now. We have to fix the ffmpeg command to reflect that. Remove the hls_time and hls_wrap flags. Realistically, you should rate limit the jpeg output, otherwise you might run a high cpu load decoding all of the mp4 frames and encoding them to individual jpegs. To add a rate limit, you can pass -vf fps=fps=2 right in front of pipe:1. This would reduce the jpegs to 2 frames per second. If your cpu load is still too high, there are other things we can try.

To fix the video smearing, add another value to the command to force ffmpeg to connect using tcp instead of the default udp. Of course, this will cause slightly more delay with video, but will ensure that the data is complete.  in case your camera does not support tcp only, would be to give a list of preferred connection types in order -rtsp_transport +tcp+http+udp+udp_multicast -rtsp_flags +prefer_tcp

Zie complexity of audio visual content : https://journal.code4lib.org/articles/9128

the demuxer/muxer is the format when using the -f param and the decoder/encoder is when using the -c:v param

uitleg over muxing en copying: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/17?u=bartbutenaers

1. Check whether ffmpeg ia accessible (by requesting the ffmpeg version).
2. The 1st thing we have to do is figure out how what type of video/audio streams are available. Whenever you get a chance to get to the command line, run ffprobe on your inpu

toepassingen voor losse jpegs: https://discourse.nodered.org/t/how-to-build-a-video-surveillance-system-from-scratch/51077/28?u=bartbutenaers

If you only want to create 1 jpeg every 30 seconds or so, it would be best if we use mp4frag to occasionally output its buffer and pass that to a another ffmpeg-spawn node to create a single jpeg. i actually do that once per 10 minutes on one of my video streams.

image smearing: 
https://discourse.nodered.org/t/how-to-display-cctv-camera-in-dashboard-rtsp/5860/33?u=bartbutenaers (en net daarboven staat een foto)

flow for scaling: https://discourse.nodered.org/t/how-to-build-a-video-surveillance-system-from-scratch/51077/32?u=bartbutenaers



CODE DOCUMENTATION
====================
streaming mp4: There are some options when it comes to piping an mp4. You can take an RTSP input stream and mux it (without re-encoding) out to mp4. The key to having a pipe-able mp4 will be the -movflags. Some combinations of -movflags include, but not limited to, +frag_keyframe or +empty_moov or +dash or any combination including atleast 1 of those. Without the movflags, ffmpeg will error with muxer does not support non seekable output.

The data containing jpegs coming out of ffmpeg will have to first be piped into some parser that can hold the data until the entire jpeg is pushed in. At this point, the jpeg buffer can be larger than the system piping limit and there will be no limit to pass it to further processing within nodejs..  It was worse on mac, whose pipe buffer size is 8192, while linux is 65536 or ~32000, and windows being somewhere near ~90000, if i remember correctly. The claim by mac was that a smaller piping size was more efficient, but I found it to be a huge pain when dealing with piping data in to nodejs from external processes.
When the segments are larger than the buffer size, which mean you will have more messages than segments since they are broken into chunks of buffer.
 So, if you want to output a jpeg without catching the chunks and re-assembling them, then you would have to lower the jpeg quality or resolution so that it will be within 65k
--> opmerking: de meeste scaling filters in de voorbeelden worden gebruikt om dit probleem te omzeilen...

The cams with audio are already encoded with aac, which makes stream copying them much easier and use less cpu load in ffmpeg
Screenshot of my hikvsision wet interface: https://discourse.nodered.org/t/how-to-build-a-video-surveillance-system-from-scratch/51077/17?u=bartbutenaers

In the camera's gui, I would set the i frame interval to the lowest settings that it allows. Since we will be stream copying, that setting will have a direct affect on the segment duration. Shorter segments is usually better for live streaming. For example, if your fps is set to 20 and the i frame is set to 40, then you will have segments with a duration approximately 2 seconds long.

Another thing to consider is the byte size of the segments. Having a higher bitrate equals bigger segments, which is then slower over a network. Lower the quality settings to the least acceptable. That is something you will have to tweak many times to get right.


A lot of encoding and large file sizes and high fps is not practical for a pi. A better solution would be to stream copy the h264 video from rtsp to mp4 and play it in a mediasource extension video player (without writing files to the disk).

Apart commando make voor hwaccels (ffmpeg -hide_banner -hwaccels) :
If your system supports hwaccel (ffmpeg -hwaccels), I would take advantage of that for GPU decoding of mp4 (rtsp) so that the CPU can encode the jpeg. For me, that cut my cpu load by a measurable amount for a single ffmpeg command. If you don't need the full size image or high fps, then I would decrease it by changing the vf to -vf fps=fps=2,scale=iw/2:-1 (input width divided in half, height auto) or just use the sub stream of the ip cam as the input and have the source set at a smaller size and framerate.

We are taking your h264 encoded video that is inside the rtsp stream and muxing it to an mp4 container so that it can be playable in the browser.

scale=iw/2:-1
Not bad : Makes me go from 40% to 25% cpu while losing a bit in quality (960x540px).

mp4 segmenten over mqtt:
https://discourse.nodered.org/t/sending-rtsp-camera-streaming-over-internet/46606/6?u=bartbutenaers


For clarification, the only communication from node-red-contrib-mp4frag -> node-red-contrib-ui-mp4frag is when it sends the payload carrying the http url info for the HLS playlist, url to mp4 video, and the socket .io connection info. It is then up to ui_mp4frag in the browser to use that info to connect to the server running in mp4frag. So, essentially it is a roadmap telling the client how to get there. I avoided the route of sending all the video buffer directly to ui_mp4frag so that it would not overwhelm the dashboard. Now that I think about it, maybe it could have handled it, since after all, I am using the existing http server and socket .io server but just adding to its routes and namespaces, etc.


RTSP can carry audio with the video. The only problem that can occur is the type of audio codec in the ip cam may not be the right type of audio that can be played in the browser, which would require audio encoding and uses a bit of cpu, but not too much. Some of my newer cams have audio that is already encoded with the aac codec, which can easily be played in the browser. Maybe yours does?  The best way would be to use the 2nd video stream that should be available on your rtsp ip cam. That will be the least resource hog since you can just stream copy it without re-encoding. I always use both the main stream and sub streams from my cams so that I can stream the lower resolution version when in a slow wireless network.

You really don't need the socket. io player. You can just use hls.js to play the hls.m3u8 file. It is much more stable compared to my custom player.
Future plans: I would like to setup sockets for feeding the HLS video files from server to client. HLS.js does not seem like it was created for live streaming and tends to be far behind realtime. My old video player using socket.io 6 could keep up near realtime, delayed only by the duration of a single segment. The tradeoff for keeping up near realtime was video and audio much less smooth than HLS.js.


As for the other questions , I don't have any good answers since I only do 24/7 recording without any motion/object detection. ffmpeg takes care of writing mp4 video all day long, broken into individual videos of 15 minutes duration. I have it written to a 6TB WD purple in an external enclosure. Once a day a script runs to unlink old videos more than 2 weeks old

test streams:
yessss ! try this nice quality Red Bull TV: http://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master_1660.m3u8
and more here for English : https://www.astra2sat.com/streaming/iptv/free-iptv-english/ 15
See IPTV tab for more contents

fragmented mp4 a format that is cross browser compatible

RECORDING
=========
https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/27?u=bartbutenaers
https://discourse.nodered.org/t/storing-video-as-mp4/41911/17

Ook hier: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/336?u=bartbutenaers (en de uitleg eronder in de volgende posts)

Delay 20 seconden uitleg: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/36?u=bartbutenaers
The minimum real-time delay of video running in the browser will always be based on the segment duration. So, a segment duration of 10 seconds will mean that the real-time video playback will be delayed by that much time plus the time to transfer the video from server to client and start playing it.

Duration of segments: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/48?u=bartbutenaers
https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/50?u=bartbutenaers
Iframe interval. Sometimes it is called GOP. It seems to be set to the lowest value of 2. My lowest quality cam is also set to 2, but never pushes out segments less than 10, while my other good cams honor the setting. It might be a hardware issue.
5s delay is actually really good when using hls.js to play the video. That is near the best it could be.   But not very handy when using PTZ

~2 second latency in an rtsp stream is normal. I've never found a way to reduce it, although some that were ~4 seconds could be reduced to about 2 seconds by reducing the I-frame interval.

It seems that your VLC app directly connected to the cam's rtsp url. Can you try connecting VLC to your hls.m3u8 playlist and see how that compares to the browser. That would be a more accurate comparison of hls.js in the browser vs VLC app since they will use the same source.

Manier om het pushen van images via socketio enkel te doen als een cam getoond wordt in de dashboard:
https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/83?u=bartbutenaers

Buffering van segmenten: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/99?u=bartbutenaers

I added the mp4 video route to the latest update of node-red-contrib-mp4frag. You can now access a live mp4 file. It is a similar route as the others, /mp4frag/e1444359.6666/video.mp4.

Since mp4frag is buffering video chunks to serve via http or socket io, it has to be notified when it should reset itself and clear the buffer. Currently, it is tightly coupled to listening for a code or signal from exec to know when the ffmpeg process has stopped and it can ready itself to listen to a fresh new mp4 stream. If it never gets that signal, it will still be trying to receive fragmented mp4 pieces.

Soorten sources: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/119?u=bartbutenaers

For the ui-mp4frag, you can now change the threshold setting. This is the percentage of visibility of the video player before triggering loading/unloading. For example, if set to 0.3 and the video player is scrolled partially out of view, it will have to be atleast 30% visible before it will load. My wife did not like the hard coded setting of 50%.

extra mp4frag url's: https://discourse.nodered.org/t/beta-testing-nodes-for-live-streaming-mp4/33743/333?u=bartbutenaers

test streams   https://github.com/kevinGodell/iptv/tree/master/channels

Kunnen we hier iets voor voorzien??  https://discourse.nodered.org/t/monitoring-a-video-live-stream/45991

Misschien wel een autostart voorzien?

            

/*
For h265 :  TODO build ffmpeg met --enable-gpl --enable-libx265

 
 Zeker lezen!!!!!!!!!
 https://trac.ffmpeg.org/wiki/StreamingGuide

allowed_media_types
Set media types to accept from the server.
‘video’
‘audio’
‘data’
By default it accepts all media types.

digest authentication


When receiving data over UDP, the demuxer tries to reorder received packets (since they may arrive out of order, or packets may get lost totally). This can be disabled by setting the maximum demuxing delay to zero (via the max_delay field of AVFormatContext).

This smearing is caused by "lost" RTP packets , specifically during reception of an I frame. FFMPEG's H.264 decoder does a really good job of concealing the occasional lost packet, but when losses occur during an I frame there's nothing the decoder can do.
To fix the video smearing, add another value to the command to force ffmpeg to connect using tcp instead of the default udp. Of course, this will cause slightly more delay with video, but will ensure that the data is complete.

*/

q:v integer
Quality factor. Lower is better. Higher gives lower bitrate. The following table lists bitrates when encoding akiyo_cif.y4m for various values of -q:v with -g 100:

-q:v 1 1918 kb/s
-q:v 2 1735 kb/s
-q:v 4 1500 kb/s
-q:v 10 1041 kb/s
-q:v 20 826 kb/s
-q:v 40 553 kb/s
-q:v 100 394 kb/s
-q:v 200 312 kb/s
-q:v 400 266 kb/s
-q:v 1000 237 kb/s
