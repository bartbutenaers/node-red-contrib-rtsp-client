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


## Node properties

### General
    
#### FFmpeg path
The path to the ffmpeg executable.  This can be a full path, or simply `ffmpeg.exe` if this executable is in the system PATH.

#### RTSP url
The url where the RTSP stream is being hosted.

#### Username
The logon username in case of basic authentication.

#### Password
The logon password in case of basic authentication.

#### Protocol:
The network transport protocol being used to transfer the packets:
+ ***Prefer TCP***: First try TCP, and if that fails then switch to UDP.
+ ***UDP***: Fast connection, but packets can get lost or out of order.
+ ***TCP***: Slower connection, but all packets arrive in order.
+ ***UDP multicast***: Point all clients to the single multicast IP address.
+ ***HTTP***: HTTP tunnel for RTSP across proxies.

#### Stats period
The time period between statistic output messages (in seconds).  Note that decimals are allowed (e.g. ``2.5`).  When this field is empty, no statistics messages will be sent.

#### Restart period
After which period (in seconds) the RTSP stream should restart, after an unexpected halt.  When this field is empty, the stream will not be restarted automatically.

#### Auto start
When autostart is enabled, the RTSP stream will be started automatically when the flow is started or deployed.

### MP4 video

#### Codec
The decoder that will be used to decode the input video stream.
+ ***No video***: The input video will be ignored, which means the output MP4 segments will not contain video.
+ ***Copy input codec***: The output video will have the same format as the input video (i.e. no re-encoding).
+ ***H.264***: The input video will be re-encoded to H.264.
+ ***H.265 (= HEVC)***: The input video will be re-encoded to H.265.
+ ***H.264 OMX (GPU acceleration)***: The input video will be re-encoded to H.264 via hardware acceleration.
+ ***H.264 MMAL (GPU acceleration RPI)***: The input video will be re-encoded to H.264 via hardware acceleration on Raspberry.

#### Frame rate
The fps (frames per second) in the output video.  When this field is empty, the fps will not be changed (i.e. no re-encoding).

#### Resolution
The resolution of the output video, as width and height in pixels.  When this field is empty, the resolution will not be changed (i.e. no re-encoding).

#### Quality
A low quality factor means better quality video images, but that will result in a higher bitrate (kB/sec).  When this field is empty, the quality will not be changed (i.e. no re-encoding).

#### >Min frag duration
Avoid mp4 fragments to be created that are shorter than this duration (in microseconds).  When this field is empty, the fragment duration will not be changed (i.e. no re-encoding).

### MP4 audio

#### Codec
The decoder that will be used to decode the input audio stream:
+ ***No audio***: The input audio will be ignored, which means the output MP4 segments will not contain audio.
+ ***Copy input codec***: The output audio will have the same format as the input audio (i.e. no re-encoding).
+ ***AAC***: Free AAC decoder.
+ ***AAC FDK (non-GPL)***: AAC decoder not included in standard FFmpeg.
+ ***MP3***: MP3 decoder.

#### Sample rate
The audio sampling frequency.  When this field is empty, the sampling frequency will not be changed (i.e. no re-encoding).

#### Bit rate
The audio bit rate.  When this field is empty, the bit rate will not be changed (i.e. no re-encoding).

### Images

#### Jpeg output
Specify how the jpeg output needs to be triggered:
+ ***None***: No output messages should be sent, containing jpeg output images.
+ ***All frames***: For every frame in the input stream, a jpeg needs to be decoded.
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
