# node-red-contrib-rtsp-client
A Node-RED node that acts as an RTSP client (via Ffmpeg)

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-rtsp-client
```

I would like to thank [Kevin Godell](https://github.com/kevinGodell) for sharing all his FFmpeg knowledge with the Node-RED community.  This node contains a lot of information that I learned from him.  Please have a look at his [node-red-contrib-ffmpeg-spawn](https://github.com/kevinGodell/node-red-contrib-ffmpeg-spawn) node if you want to do other stuff with FFmpeg in Node-RED.

***PREREQUISITE: FFmpeg needs to be installed on your system before you can use this node!!!!***

## Support my Node-RED developments
Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Introduction

### RTSP basics
RTSP (Real-Time Streaming Protocol) is an application layer protocol designed to control the delivery of multimedia data. While RTSP was originally intended to be used to deliver entertainment television, it is now mainly used in IP cameras.  RTSP can be compared to a TV remote control, because it can start/pause/stop the video and audio streams from the IP camera.

![RTSP protocol](https://user-images.githubusercontent.com/14224149/171836791-53dac8ed-e82c-4cd5-8aeb-aa752cbf05c7.png)

Since [FFmpeg](https://ffmpeg.org/ffmpeg.html) contains everything we need (RTSP demuxer, decoders, ...), this node will start FFmpeg in a child process as RTSP client.  By running FFmpeg in a child process, we avoid that the main Node-RED process becomes unresponsive (unless you hardware resources are not sufficient to handle all these computations of course...).

### Use cases
This node can be used to capture audio and video streams from your IP camera in your Node-RED flow.  Which means that the audio and video segments will arrive in your Node-RED flow, so these segments can be used for all kind of stuff:

+ Grab JPEG images from your stream to do image processing in the Node-Red flow (i.e. face recognition, object detection, license plate recognition, ...).

+ Convert the audio and video segments to a fragemented MP4 stream, because browsers cannot play directly RTSP streams:

   ![image](https://user-images.githubusercontent.com/14224149/171839987-ab04d48d-04ba-4e6a-85fb-3e413baf6651.png)

## Usage

### Extract JPEG images
The compressed video stream (e.g. H.264) will contain 3 types of images, as described in this moving Pac-Man picture from [wikipedia](https://en.wikipedia.org/wiki/Video_compression_picture_types):

![frames](https://user-images.githubusercontent.com/14224149/172034652-49b96e5c-43f8-4afe-99f7-5dd892feb7f9.png)

+ ***I‑frame***: a complete JPEG image.
+ ***P‑frame*** (= delta‑frame): only contains the changes between the current frame and the previous frame (e.g. a moving car or persion).  Since it doesn't contain any unchanged background pixels, a lot of data can be compressed.
+ ***B‑frame***: only contains differences between the current frame and both the previous and following frames.  Which means it allows even more compression compared to a P-frame, since it will contain much less pixels.

This node can extract JPEG images from the compressed video stream, to be able to execute ***image processing*** on those images in Node-RED (e.g. object detection, license plate recognition, ...), which will be send in the output messages on the 'Images' output.

Note however that there are different ways of working, depending on the use case:
+ If *ALL images* need to be extracted from the video stream, you can use the ***ALL frames*** option.  However this means that all the P and B frames need to be decoded, to reconstruct the original complete JPEG images, which will result in high CPU and RAM consumption on your Node-RED server!

   In this case it might be more efficient to get an MJPEG stream from you camera (e.g. using my [node-red-contrib-multipart-stream-decoder](https://github.com/bartbutenaers/node-red-contrib-multipart-stream-decoder), i.e. a continious stream of complete JPEG images.  Because then your Node-RED server won't have to do any decoding.  However that will result in much more network traffic (since there is only JPEG compression of individual images, but no compression between the images in the stream).  And not all modern camera's still support MJPEG streaming..

+ If *less images* are sufficient, then the ***"I-frames"*** option is much better.  In that case only the I-frames are extracted from the compressed video stream, which are already complete JPEG images (so no expensive decoding is required).  To reduce CPU usage even further, it is beneficial to lower the frame rate (FPS) to avoid to much images being extracted and processed.  

   Note that the ***I-frame interval*** is adjustable on most camera's, so you can specify how often I-frames will be inserted by your camera in the compressed video stream. 

+ If *only once and a while* an image is required, you might be better of using simply a http-request node to get a snapshot image from your camera...

## Node properties

### General
    
#### FFmpeg path
The path to the ffmpeg executable.  This can be a full path, or simply `ffmpeg.exe` if this executable is accessibel via the system PATH.

#### RTSP url
The url wia which the RTSP stream is accessible.  

This url might be provided in the manual of your camera, on the website of your camera manufacturer.  If you can't find it there, you might have a look in the ISpy [database](https://www.ispyconnect.com/cameras/), which contains RTSP connection url' for a large amount of IP cameras.

#### Username
The username used to login, in case basic authentication has been activated.

#### Password
The password used to login, in case basic authentication has been activated.

#### Protocol:
The network transport protocol being used to transfer the packets from the camera to this node:

+ ***Prefer TCP***: First try TCP, and if that fails then switch to UDP.
+ ***UDP***: UDP connections can deliver data fast, because network packets will never be retransmitted in case their get lost.
   + This works fine e.g. for MJPEG streams, because there is only a small delay and only few pixels get lost. but packets can get lost or out of order.
   + However losing RTP packets can result in bad quality, most ofthen when this happens during reception of an I-frame. The H.264 decoder is good in concealing the occasional lost packet, but when losses occur during an I frame then ***'image smearing'*** will occur.
+ ***TCP***: TCP connections will deliver all packets in the correct order.  However due to retransmission of packets, this will result in slower connections compared to UDP.
+ ***UDP multicast***: Point all clients to the single multicast IP address.
+ ***HTTP***: HTTP tunnel for RTSP across proxies.

Although TCP connections will introduce an extra delay (due to packet retransmissions), it is the preferred protocol to avoid artifacts (e.g. image smearing)!

#### Stats period
The time period between statistic output messages (in seconds).  Note that decimals are allowed (e.g. ``2.5`).  When this field is empty, no statistics messages will be sent.

#### Restart period
After which period (in seconds) the RTSP stream should be restarted automatically, after an unexpected halt has occurred:

![image](https://user-images.githubusercontent.com/14224149/171939084-d07b7959-c826-4a65-9cc7-c6e7c823c7d8.png)

When this field is empty, the stream will not be restarted automatically.

If more complex restart mechanisms are required, you can implement this yourself.  See this (TODO) wiki page for an example.

#### Auto start
When autostart is enabled, the RTSP stream will be started automatically when the flow is started or deployed.  

Of course the same result can be achieved using an Inject node that automatically triggers a 'start' message when the flow is started:

![image](https://user-images.githubusercontent.com/14224149/171997662-12392613-2092-4e0e-b16a-086f20277574.png)
```
[{"id":"836ed03a9b4640a6","type":"inject","z":"d9e13201faaf6e32","name":"autostart ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":true,"onceDelay":0.1,"topic":"start","x":1470,"y":320,"wires":[["fa819dde90fd31d5"]]},{"id":"fa819dde90fd31d5","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"4","restartPeriod":"","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","x":1690,"y":320,"wires":[[],[],[],[]]},{"id":"3dfba994e4e4eed6","type":"inject","z":"d9e13201faaf6e32","name":"stop ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop","x":1490,"y":360,"wires":[["fa819dde90fd31d5"]]}]
```

### MP4 video

#### Codec
The decoder that will be used to decode the input video stream.
+ ***No video***: The input video will be ignored, which means the output MP4 segments will not contain video.
+ ***Copy input codec***: The output video will have the same format as the input video (i.e. no re-encoding), which can only be used in case the input video is H.264 already.
+ ***H.264***: The input video will be re-encoded to H.264.
+ ***H.265 (= HEVC)***: The input video will be re-encoded to H.265.
   Note that FFmpeg needs to be build explicit to support H.265 decoding (... --enable-gpl --enable-libx265 ...).
+ ***H.264 OMX (GPU acceleration)***: The input video will be re-encoded to H.264 via hardware acceleration.
+ ***H.264 MMAL (GPU acceleration RPI)***: The input video will be re-encoded to H.264 via hardware acceleration on Raspberry.

The most optimal scenario is that your camera stream contains H.264 video, because then then you *"Copy input codec"* to keep the AAC.  That way no re-encoding is required, so only few CPU and RAM is required on your Node-RED server.  And since all major browsers support H.264, you can easily display it (e.g. by converting it to framented MP4).

Some modern camera's currently support H.265 which has much better video compression, compared to H.264.  Which means that network traffic is lower, and it will use much less disk space if you want to store recorded video.  So for these purpose H.265 will be a better choice.  However once you want to display that recorded H.265 in your browser, you will need to re-encode it to H.264 again.  Because at this moment no browser supports H.265 yet!  And the re-encoding will consume a lot of CPU and RAM on your Node-RED server...

Some notes about *hardware acceleration*:
+ It is not useful if there is no re-encoding.
+ It not used for the individual jpeg images, because that is still done on the DPU (instead of on the GPU).
+ There is a limit on the size input of the video W x H for the CPU, otherwise FFmpeg will fail without a decent error description.
+ CPU decoding also has some limitations, e.g. not all FFmpeg filters work with it.

#### Frame rate
The fps (frames per second) in the output video.  When this field is empty, the fps will not be changed (i.e. no re-encoding).

#### Resolution
The resolution of the output video, as width and height in pixels.  When this field is empty, the resolution will not be changed (i.e. no re-encoding).

#### Quality
A low quality factor means better quality video images, but that will result in a higher bitrate (kB/sec).  When this field is empty, the quality will not be changed (i.e. no re-encoding).

Some example values (which will be different in other setups):

| Quality factor  | Bit rate (kb/s) |
| --------------- | --------------- |
| 1               | 1918            |
| 100             | 394             |
| 400             | 266             |
| 100 0           | 337             |

#### Min frag duration
To avoid that mp4 fragments will be created that are shorter than this duration (in microseconds).  When this field is empty, the fragment duration will not be changed (i.e. no re-encoding).

### MP4 audio

#### Codec
The decoder that will be used to decode the input audio stream:
+ ***No audio***: The input audio will be ignored, which means the output MP4 segments will not contain audio.
+ ***Copy input codec***: The output audio will have the same format as the input audio (i.e. no re-encoding).
+ ***AAC***: Free AAC decoder.
+ ***AAC FDK (non-GPL)***: AAC decoder not included in standard FFmpeg.
+ ***MP3***: MP3 decoder.

The most optimal scenario is that your camera stream contains AAC audio (which is the successor of MP3), because then then you *"Copy input codec"* to keep the AAC.  That way no re-encoding is required, so only few CPU and RAM is required on your Node-RED server.  And since all major browsers support AAC, you can easily display it (e.g. by converting it to framented MP4).

#### Sample rate
The audio sampling frequency.  When this field is empty, the sampling frequency will not be changed (i.e. no re-encoding).

#### Bit rate
The audio bit rate.  When this field is empty, the bit rate will not be changed (i.e. no re-encoding).

### Images

#### Image source
Specify how the jpeg output needs to be triggered:
+ ***None***: No output messages should be sent, containing jpeg output images.
+ ***All frames***: For every frame in the input stream, a jpeg will be decoded. 
+ ***I-frames***: Only the already complete I-frame jpeg imags will be extracted from the mp4 fragments (i.e. no decoding).

#### Frame rate
The fps (Frames Per Second) of the jpeg images.  When this field is empty, the frame rate will not be changed (i.e. no re-encoding).

#### Resolution
The resolution of the output jpeg images, as width and height in pixels.  When this field is empty, the resolution will not be changed (i.e. no re-encoding).

### Advanced

#### Socket timeout
The socket TCP I/O timeout in micro seconds.  When this field is empty, the node will keep waiting for the RTSP stream to arrive.

#### Maximum delay
A low delay value will a.o. result in the re-ordering buffer to be skipped. 

#### Socket buffer size
The maximum UDP socket receive buffer size in bytes.

#### Reorder queue size
The number of packets to buffer for handling of reordered packets.

When receiving data over UDP, the demuxer tries to reorder received packets, since they may arrive out of order (or packets may get lost totally). 
