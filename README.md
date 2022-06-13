# node-red-contrib-rtsp-client
A Node-RED node that acts as an RTSP client (via Ffmpeg).

This node allows you to control an RTSP stream from an IP cam, to capture the audio and video segments in Node-RED.  This will be achieved by starting FFmpeg in a child process.  This node will compose the required FFmpeg command line parameter list under the hood, based on settings entered in the config screen.

***Have a look at the [wiki](https://github.com/bartbutenaers/node-red-contrib-rtsp-client/wiki) for extra tutorials!***

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

## In case of issues
Please take into account that I am ***NOT*** an FFmpeg specialist.  So in case you have troubles with your audio or video (or other FFmpeg related stuff), please execute the following steps:
1. Start a discussion in the Node-RED [forum](https://discourse.nodered.org/) first, to explain your problem to the Node-RED community.  Of course it is best to mention me, to make sure I don't overlook it.
2. Afterwards create an issue in this Github repository, and add a link to the Discours discussion to it.
3. As soon as we found a solution with the help of the community, I will adjust the code or the readme page of this Github repository.

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

### Controlling an RTSP stream
You can control an RTSP stream by injecting messages with topic *"stop"*, *"start"*, *"restart"*.  

The following flow demonstrates how to do this:

![control_rtsp_stream](https://user-images.githubusercontent.com/14224149/172038160-2b910686-d06d-40d6-b9aa-497af65b9dde.gif)
```
[{"id":"5ea47c6539af6672","type":"inject","z":"d9e13201faaf6e32","name":"start ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"start","x":2250,"y":920,"wires":[["7ae72da519e1869a"]]},{"id":"6c121924fac05805","type":"inject","z":"d9e13201faaf6e32","name":"stop ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop","x":2250,"y":980,"wires":[["7ae72da519e1869a"]]},{"id":"967a5b6efb3b6cd0","type":"inject","z":"d9e13201faaf6e32","name":"restart ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"restart","x":2240,"y":1040,"wires":[["7ae72da519e1869a"]]},{"id":"7ae72da519e1869a","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"4","restartPeriod":"4","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","credentials":{},"x":2450,"y":920,"wires":[[],["205a50453bbe5842"],[],[]]},{"id":"205a50453bbe5842","type":"debug","z":"d9e13201faaf6e32","name":"Status","active":true,"tosidebar":true,"console":false,"tostatus":true,"complete":"true","targetType":"full","statusVal":"topic","statusType":"msg","x":2610,"y":920,"wires":[]}]
```

In case of a restart, the stream will first be stopped and then started again (as soon as the stream is stopped completely).  This much more convenient compared to send successive stop and start messages yourself, because in that case you would have to watch the status (and only send the start as soon as the stream has been stopped).

A ***status message*** will be send on the *"Status"* output, every time the status of the stream changes.  The `msg.topic` will be:
+ ***"started"*** when the stream is started.  The `msg.payload` will contain both the PID of the FFmpeg child process`, and the *generated FFMpeg command line arguments* (as an array):

   ![started output msg](https://user-images.githubusercontent.com/14224149/173192143-4cdc739e-726e-419b-bd75-ab6bbe4803a0.png)
   
   It might be useful to analyze the generated command line arguments, to understand how this node communicates with FFmpeg (and as an aid during troubleshooting).

+ ***"stopped"*** when the stream is stopped.   The `msg.payload` will contain both the PID of the FFmpeg child process`, and the *reason* why the stream was stopped:

   ![stopped output msg](https://user-images.githubusercontent.com/14224149/173192295-1785fe56-2126-4624-b017-7c0580bf4d34.png)
   
   There are different reasons why a stream has stopped:
   + *"input msg"*: when the stream was stopped by injecting an input messag with topic 'stop'.
   + *"input msg"*: when the stream was stopped due to an FFmpeg error (e.g. invalid command line argument).  In this case the list of errors will also be included.  The errors are stored per category, based on where they were raised (by the child 'process' or in the ffmpeg 'stderr' pipe).
   + *"socket timeout"*: if no data arrived within the socket timeout interval (as specified in the config screen).

The PID (process id) in the payload of those messages, is the same PID as you will see appearing in the node status.

### Handling the audio/video segments
Once an RTSP stream is started, this node will start sending output messages on the *"Data"* output.  These messages will contain ***MP4 containers***, containing audio and/or video chunks (as specified in the audio and video codecs in the config screen).

CAUTION: the FFmpeg subprocess will pass those segments to this node via pipes.  However the OS will limit the length of the data buffer that can be transferred via a pipe, for example 65 Kbyte on Raspbian.  As a result this node will receive only chunks of data, instead of complete audio and video segments.  As a result, this node will store chunks of data into the MP4 containers (called *'muxing'*).  This means that the MP4 containers (in the output messages) contain only chunks of audio and video segments, so those ***MP4 containers are not playable***!!!  Keep that in mind when e.g. you want to replay such mp4 files that have been recorded to disk...

It is for example possible to convert the MP4 containers to fragmented MP4 (which is a cross browser compatible format), to display the stream in the Node-RED dashboard:

![fragmented mp4](https://user-images.githubusercontent.com/14224149/172045730-e5dc3b3d-89a1-45e3-ae4f-39da8af53518.png)
```
[{"id":"55ffc3d8e7afc397","type":"inject","z":"d9e13201faaf6e32","name":"start ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"start","x":510,"y":1220,"wires":[["51c2a6010f142409"]]},{"id":"1823e6452db2e37e","type":"inject","z":"d9e13201faaf6e32","name":"stop ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop","x":510,"y":1280,"wires":[["51c2a6010f142409"]]},{"id":"51c2a6010f142409","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"4","restartPeriod":"4","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","x":710,"y":1220,"wires":[["2d4bb1961328ba47"],[],[],[]]},{"id":"2d4bb1961328ba47","type":"mp4frag","z":"d9e13201faaf6e32","name":"","outputs":2,"hlsPlaylistSize":"4","hlsPlaylistExtra":"0","basePath":"mydemo","repeated":"false","timeLimit":"60000","preBuffer":"1","autoStart":"false","statusLocation":"displayed","x":910,"y":1200,"wires":[["06a0e9bc45bc7dfb"],[]]},{"id":"06a0e9bc45bc7dfb","type":"ui_mp4frag","z":"d9e13201faaf6e32","name":"","group":"3a6870094754bf21","order":0,"width":"10","height":"7","readyPoster":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAMAAACtqHJCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMzgwMTE3NDA3MjA2ODExODIyQUIzREQ3RTA0MDAyNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRkU5MkM4RDJCNTkxMUVCQjJCOTg0MEQ0QThCQ0YyQyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRkU5MkM4QzJCNTkxMUVCQjJCOTg0MEQ0QThCQ0YyQyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Rjc3RjExNzQwNzIwNjgxMTgyMkFDQTkzQjdGQkY1MzAiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDM4MDExNzQwNzIwNjgxMTgyMkFCM0REN0UwNDAwMjQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7USCkmAAAAM1BMVEUAplH///9Cs3HR6dqc0rDp9O1rwIy43sUmrWJ9xpn0+vbF5NBYun+q2LuNzKTd7+P///8HAxLBAAAAEXRSTlP/////////////////////ACWtmWIAAA6fSURBVHja7d1rY6JIGoBRI6gIXub//9qZ7o4KRdVbZezuJLvnfNpJektujyAg2fwDFG0sAhAICAQEAgIBgYBAQCAgEBAIIBAQCAgEBAICAYGAQEAgIBAQCCAQEAgIBAQCAgGBgEBAICAQQCAgEBAICAQEAgIBgYBAQCAgEEAgIBAQCAgEBAICAYGAQEAggEBAICAQEAgIBAQCAgGBgEBAIIBAQCAgEBAICAQEAgIBgYBAAIGAQEAgIBAQCAgEBAICAYGAQACBgEBAICAQEAgIBAQCAgGBgEAsAhAICAQEAgIBgYBAQCAgEBAIIBAQCAgEBAICAYGAQEAgIBAQCCAQEAgIBAQCAgGBgEBAICAQQCAgEBAICAQEAgIBgYBAQCAgEEAgIBAQCAgEBAICAYGAQEAggEBAICAQEAgIBAQCAgGBgEBAIIBAQCAgEBAICAQEAgIBgYBAAIGAQEAgIBAQCAgEBAICAYGAQACBgEBAICAQEAgIBAQCAgGBgEAsAhAICAQEAgIBgYBAQCAgEBAIIBAQCAgEBAICAYGAQEAgIBAQCCAQEAgIBAQCAgGBgEBAICAQQCAgEBAICAQEAgIBgYBAQCAgEEAgIBAQCAgEBAICAYGAQEAggEBAICAQEAgIBAQCAgGBgEBAIIBAQCAgEBAICAQEAgIBgYBAAIGAQEAgIBAQCAgEBAICAYGAQIAkEAAAAAAAAAAAAAAAAAAAAAAAgD/v0u/efjj0228/L33/c1be+t56/d92+rWi33aZnw2b7fv/6n7+/PZfN12/n/2/0t++b0H3PMbZT6dsIskI1/64+lUXzsQP558/OdxeaL5Rv/9su57WTLPrMdcjJb9cT+TwPtO7IZrR5ctXlmNxwsprp7IwCN2229mPjr9+Mm4qgfxY88e2FTt0yc+P9UB+TMKlKZDLvL35LPyYh7vpMURmWrt9bcz7ZF6TkLfFibwNcqnN6Nt13xpIacLKa6eyMAjd1vZp9e7SNQTy37tfy4odrqtfXFoC+e+Vh4ZAzvONYtn9Y7aG2RRt422wMOb7OLvVdrgtBbLL/P9rL18LpDRhwdqJFwahaf2Wfrgv3IZA7oVEK/aQ+c22KZDkpbtwHma7wmm1BRxnW0l+Wi+VMTO/WEzVaiILO5C4gVogpQkL1k68MIg/bq7fS673n7QEcksrWLH78pbfuN3EgSze00+LbXNK33mv5Vcat/GYm+K87POBFHYg8cvXAilNWLB24oVB6Lj+vDfeF21TILvq5j1lf3Vq3G6GWiBDptf7z4Yk+3MwJ3085k9d+26utAMpvfy5JZDihAVrJ14YNJ3G6lbbxrYxkPe1VF6xw/xD43AonRuKNtswkFNuU7omm9Awf7MvvNJYGTOdl+1hcbyYTmRpBxK/fCWQ0oSFaydcGISG1ee9/eP4Nh/Ir386nJefQsrb8HG+L3gc1F1L282v8ftx9u/CQI6LDWJaHjqeV6fmVsNdduudWnbM9byc5zuJZCKLO5D45eOjyeKEhWsnXBjEdunu91LaLrdJS/3iv8sr9pyc8h3TV8yu4sfR/lDZavrlCdPlO+11ORFTblq364/p2TEz8/KWOXDrFgdju00lkOTlK4GUJixcO+HCINal756zpRcHsjy0La/Y9ETZtfAhJB1/9u/CreZ2Tn95ZicJ/zpPIB1uKp0r6tKzRYV5mdaj7uvns7MvXwmkNGHx2okWBrFz+nlvKh36p6vgvgVv4xWbJjgVjoDT8Q+PfxduNb8mY0wuDi/n67TYQtLh1qfy8mMW5+W6HrW8A4lfvhJIacLitRMtDJ48zzt7e6kE0uU++JYD2a43/KZALpWt5n0bPS5LX56e6xfHGKXzTX1lzOK87FajBjuQ4ssfGgIpTVi8dqKFQWyfXhLPXFD70oG8vx9Op2QrH+ejTdmLccVASmO2BxLsQF4JpDhhlbUTLAxi2+QD3Ha2//0WgRxvqzspfZofDY2LI6NqIKUxmwOJdiCvBFKcsMraCRYGFePynN9+9p/fIpD+9q92y9LnW/1pOXI1kNKYzYFEO5BXAilOWGXtBAuDiuvyI1s/Wz/fIpDD7f1wWpY+zK4V9MvrANVr3qUxWwPZRjuQuM84kOKEVdZOsDCoSLbXc/HM/hcN5Hrr+5y8zvWxDU3Lj7Sl00j76piNgRzCN+kXAilOWGXtBAuDxtNYl9VZ3u8RyHhb831yZqd/HHePy7fbdLhucXk8GrMLvmj0GHUb303+QiDFCasFUl4YVByXa3M3W/DfIZDt/Tf7ZLN8nOk5JleOk+GOb/nfZ8ZsC+SQBtd2HWRfDaQ8YbVAyguDitNy8yhf/PuagRzvH3CH9C7I3W3GzskngsVw2/NbOkHlMZsCqexA4h1Yy21nuZmtBFJeGNQszvOeyjf1fVYg8ZX0/rExjsk/Ot82vGty5Xgb3G4ej9kUSGUHUtqB1W76jGe2FkhxYVCzmzdxnNfykUDWXzb8aCBt92IdVnd1j+nB46V0SjT/5eFozJZAdrXvsxZ2YKdNvBzjma0FUlwY1Ezzld6X73r9y4E03s3bPbauQ3qP0bjYYvsokPHSNGZLIG+177OGO7AwkGBma4EUFwY15/mSPMyX32cG0vp9kPFxW+vqbO1U2GBzW+h5aBnzmUDOTwUSfLf/0DKz1UCmtnpZWZxl7HLfEvy7gTz1jcJhNk3HwgXx1UWJ7CuNp4YxnwlkfCaQy6YhkGhmq4GUFgY1+/k73pg7Hv7MQCrfSd/PDglP6Vv3UHhDrzy0IRjzmUCKJ4rCI7wokGhmq4EMTXs3NqU34Z/LfQi+N/E5gVSuns3vmxhWX0S9PvWAg64+5lOBdM8cYnUNgUQzWw2ktDCoGldfztxtvkogtedinecHGqvHJPTJnih7nvXYvWXPiObGfCqQ0oM9831O9UCima0HUlgYVF0f39+8ZFfW370Osuij9mTFbj5Wl57GOmWfb1D8zuuhOuZzgZyfCaT0dK3Gma0HUlgYVB0eZzb67CnHzwqk4dm843zs8+oUzZh7Qs5quO3yY3Uw5nOBjA3XQfbTcqut33aWn9l6IIWFQdXsxrdD8M27vxzIruXp7sNiS+xXn44fT7IdgkCWt/xHY7YFMh6eud29fyvfvdA+sw2B5BcGVbMzhtfFQv3cW02iLTo5bLguZ+S8mrXllePVcIvnSERjtgXSn8KP6enLj43PxQpntiGQ/MKg6vQ4BB+zx7VfN5D8Z6bHIfb9IVx9ONxhfnInGrPl+yA/PgJfo4/p6cufG5+LFc5sQyD5hUHdfZ0sd+LfIJDzco2vR+hyL1YM5FIbsymQS/aZ4OWXb33sTzizDYHkFwbNp7F2tytR128TSP652G8vBRKN2RLI/HnRY0sgrd9JD2dWIH/QbckPl/x9QV83kF1+mzm9Ekg0ZvNjfw7BFbn05feNgYQzK5A/6H7G8Jy/v+fLBjLkN5nZZvl8IOGYTz84rvt9gcQzK5A/6LaPP4YPN/iCgZzeyjc4fjSQcMzmQO5v99vfFkg8swL5C6ex+uvyCOXLB3IsbDPTC4GEY7YHEnxM/2Ag8cwK5A+67bwPyWfcz314dUMgfWGbuT4ZyPyh7eGYhXnZNSytlwOJZzZeOwJ5ze3pisky/tw/f9AQSOG8zuw0Vlsg80t14Zhp3N38y7PLUbvix/QPBhLPbLx2BPKaLn+A8ql/QKclkNUfulhd6W4K5DjfmMIxk3m5lZXbtC/FGwM/GEg8s/HaEchrDvmbUD/zT7A1BbLaF63OrrYE0i8OVsIxb/OyG9YfNEp3kGx/UyDxzMZrRyCv6eOvf/7dP+IZBLK8mzHzl2BWH43DQHJTG4+5nJflA0lKd5D0HwpkNWWVmd1Wz3gL5OOOmS8mbD7rz0C3B7L+Y5TH9H3zmUB+7uIqY3blRZBu96fS/HwskMqExWtHIK9ZLt3hqUCO1UD20VdMXwmkXw2V/rnKpwLpZ2/LpTH39SsRq5voj78lkMqEbes7EIF8XP5rPi2BnDfVQJKPOKULaM8HclgfrKXz8EQg03xai2NO1X1olx4CTY2BdOFyrExY7WmRAnnJNfve3hDIYdMQyHB9a3jix/OBXNcH+ekF7PZApsWSKI457EoHi6tASufrSsdi13A5Vias9rRIgbxkyi7VaiC746YlkM3QRXv+DwcyrgdLL7q0BnKfk+qY26T2cV881XbIf0xP/+HikkVxOVYmLF47AvmNp7H6xkC6fl89bHk8w22cv1mH3yNqDuSUOVpLTx01BTKbk5Yxz4s36aF8Lnq/PClc/IfTbLdaWo61CYvXjkC+vkv/64jg0G+///vJ7eEWvpsHAAAAAAAAAAAAAAAAAAAAAAAAwP+Xf4AigYBAQCAgEBAICAQEAgIBgYBAAIGAQEAgIBAQCAgEBAICAYGAQACBgEBAICAQEAgIBAQCAgGBAAIBgYBAQCAgEBAICAQEAgIBgQACAYGAQEAgIBAQCAgEBAICAQQCAgGBgEBAICAQEAgIBAQCAgEEAgIBgYBAQCAgEBAICAQEAggEBAICAYGAQEAgIBAQCAgEBAIIBAQCAgGBgEBAICAQEAgIBBAICAQEAgIBgYBAQCAgEBAICAQQCAgEBAICAYGAQEAgIBAQCAgEEAgIBAQCAgGBgEBAICAQEAggEBAICAQEAgIBgYBAQCAgEBAIIBAQCAgEBAICAYGAQEAgIBBAICAQEAgIBAQCAgGBgEBAICAQQCAgEBAICAQEAgIBgYBAQCCAQEAgIBAQCAgEBAICAYGAQEAggEBAICAQEAgIBAQCAgGBgEAAgYBAQCAgEBAICAQEAgIBgYBAAIGAQEAgIBAQCAgEBAICAYGAQACBgEBAICAQEAgIBAQCAgGBAAIBgYBAQCAgEBAICAQEAgIBgQACAYGAQEAgIBAQCAgEBAICAQQCAgGBgEBAICAQEAgIBAQCAgEEAgIBgYBAQCAgEBAICAQEAggEBAICAYGAQEAgIBAQCAgEBAIk/gX38R0SGa0LJgAAAABJRU5ErkJggg==","errorPoster":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAMAAACtqHJCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMzgwMTE3NDA3MjA2ODExODIyQUIzREQ3RTA0MDAyNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGRkU5MkM5MTJCNTkxMUVCQjJCOTg0MEQ0QThCQ0YyQyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGRkU5MkM5MDJCNTkxMUVCQjJCOTg0MEQ0QThCQ0YyQyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Rjc3RjExNzQwNzIwNjgxMTgyMkFDQTkzQjdGQkY1MzAiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDM4MDExNzQwNzIwNjgxMTgyMkFCM0REN0UwNDAwMjQiLz4gPC9yZGY6RGVzY3Jp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","hlsJsConfig":"{\"liveDurationInfinity\":true,\"liveBackBufferLength\":5,\"maxBufferLength\":10,\"manifestLoadingTimeOut\":1000,\"manifestLoadingMaxRetry\":10,\"manifestLoadingRetryDelay\":500}","autoplay":"true","unload":"true","threshold":0.1,"controls":"true","muted":"true","players":["socket.io","hls.js","hls","mp4"],"x":1170,"y":1200,"wires":[[]]},{"id":"3a6870094754bf21","type":"ui_group","name":"Fragmented MP4 demo","tab":"1ac2424f.7a9c5e","order":2,"disp":true,"width":"10","collapse":false,"className":""},{"id":"1ac2424f.7a9c5e","type":"ui_tab","name":"Camera","icon":"fa-video-camera","order":5,"disabled":false,"hidden":false}]
```
***CAUTION: THE FRAGMENTED MP4 IN THIS FLOW HAS A DELAY OF ABOUT 20 SECONDS.  NOT SURE WHAT THE ROOT CAUSE IS AT THIS MOMENT!!!!!!!!!!!!!***

1. The RTSP node sends output messages, containing MP4 containers (with chunked MP4 segments)
2. The [node-red-contrib-mp4frag](https://github.com/kevinGodell/node-red-contrib-mp4frag)node which will convert the chunked MP4 segements to ***fragmented MP4***.
3. The [node-red-contrib-ui-mp4frag](https://github.com/kevinGodell/node-red-contrib-ui-mp4frag) node will display the fragmented MP4 in the Node-RED dashboard.
   Note that you can send an url (for the HLS playlist) to the ui-mp4frag node, so the hls.js player can play the hls.m3u8 file.  But that introduces a delay, which prevents us from implementing near-realtime viewing.  Therefore we will push the MP4 fragments (via socket.io) to the dashboard, which has a much smaller delay (i.e. only the delay of a single segment). 

### RTSP stream statistics
In the config screen it can be configured how often a statistics output message should be send on the "Statistics" output.  Such an output message contains all kind of statistical information about the RTSP stream:

![statistic message](https://user-images.githubusercontent.com/14224149/172037582-900ae983-cba9-4027-866f-d2b689df5e28.png)

The following example flow shows how to show the frame rate and bit rate as the status of two Debug nodes:

![rtsp_statistics](https://user-images.githubusercontent.com/14224149/172037532-99bb77d3-3652-4eb4-8648-0b87495895f7.gif)
```
[{"id":"2ce4d3da7fe1bbf8","type":"inject","z":"d9e13201faaf6e32","name":"start ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"start","x":2810,"y":520,"wires":[["4c9b0bce27e74ed5"]]},{"id":"5659d40b7fac2c83","type":"inject","z":"d9e13201faaf6e32","name":"stop ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop","x":2810,"y":580,"wires":[["4c9b0bce27e74ed5"]]},{"id":"4c9b0bce27e74ed5","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"1","restartPeriod":"4","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","x":3010,"y":520,"wires":[[],[],["d54c7532dd6191dd","448a95fdb88ccbaa","e094d20313fed347"],[]]},{"id":"d54c7532dd6191dd","type":"debug","z":"d9e13201faaf6e32","name":"FPS","active":true,"tosidebar":false,"console":false,"tostatus":true,"complete":"payload.fps","targetType":"msg","statusVal":"payload.fps","statusType":"auto","x":3210,"y":500,"wires":[]},{"id":"448a95fdb88ccbaa","type":"debug","z":"d9e13201faaf6e32","name":"Bitrate","active":true,"tosidebar":false,"console":false,"tostatus":true,"complete":"payload.bitrate","targetType":"msg","statusVal":"payload.bitrate","statusType":"auto","x":3210,"y":560,"wires":[]}]
```
But of course you can do all kind of other stuff with these statistics: show them in a graph, trigger an alarm when the frame rate drops below a threshold for some time interval, and so on...

### Extract JPEG images
The compressed video stream (e.g. H.264) will contain 3 types of images, as described in this moving Pac-Man picture from [wikipedia](https://en.wikipedia.org/wiki/Video_compression_picture_types):

![frames](https://user-images.githubusercontent.com/14224149/172034652-49b96e5c-43f8-4afe-99f7-5dd892feb7f9.png)

+ ***I‑frame***: a complete JPEG image.
+ ***P‑frame*** (= delta‑frame): only contains the changes between the current frame and the previous frame (e.g. a moving car or persion).  Since it doesn't contain any unchanged background pixels, a lot of data can be compressed.
+ ***B‑frame***: only contains differences between the current frame and both the previous and following frames.  Which means it allows even more compression compared to a P-frame, since it will contain much less pixels.

This node can extract JPEG images from the compressed video stream, to be able to execute ***image processing*** on those images in Node-RED (e.g. object detection, license plate recognition, ...), which will be send in the output messages on the 'Images' output.

Note however that there are different ways of working, depending on the use case:
+ If *ALL images* need to be extracted from the video stream, you can use the ***ALL frames*** option.  However this means that all the P and B frames need to be decoded (using the H.264 codec) and then encoded to JPEG (using the mjpeg codec), which will result in high CPU and RAM consumption on your Node-RED server!

   In this case it might be more efficient to get an MJPEG stream from you camera (e.g. using my [node-red-contrib-multipart-stream-decoder](https://github.com/bartbutenaers/node-red-contrib-multipart-stream-decoder), i.e. a continious stream of complete JPEG images.  Because then your Node-RED server won't have to do any decoding.  However that will result in much more network traffic (since there is only JPEG compression of individual images, but no compression between the images in the stream).  And not all modern camera's still support MJPEG streaming..

+ If *less images* are sufficient, then the ***"I-frames"*** option is much better.  In that case only the I-frames are extracted from the compressed video stream, which are already complete JPEG images (so no expensive decoding is required).  To reduce CPU usage even further, it is beneficial to lower the frame rate (FPS) to avoid to much images being extracted and processed.  

   Note that the ***I-frame interval*** is adjustable on most camera's, so you can specify how often I-frames will be inserted by your camera in the compressed video stream. 

+ If *only once and a while* an image is required, you might be better of using simply a http-request node to get a snapshot image from your camera...

The following example flow demonstrates the extraction of I-frames:

![images flow](https://user-images.githubusercontent.com/14224149/172035578-8c0ada7b-06f4-4311-ad94-ff5b7c55fd88.png)
```
[{"id":"16c0a3f9f78a53d7","type":"inject","z":"d9e13201faaf6e32","name":"start ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"start","x":2210,"y":260,"wires":[["4c26ba8df942c4a2"]]},{"id":"c1b5f2a05e71929c","type":"inject","z":"d9e13201faaf6e32","name":"stop ffmpeg process","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"stop","x":2210,"y":320,"wires":[["4c26ba8df942c4a2"]]},{"id":"68df2f4fd3353152","type":"image","z":"d9e13201faaf6e32","name":"","width":"150","data":"payload","dataType":"msg","thumbnail":false,"active":true,"pass":false,"outputs":0,"x":3100,"y":280,"wires":[]},{"id":"582561fd0de6b50c","type":"msg-speed","z":"d9e13201faaf6e32","name":"","frequency":"sec","interval":1,"estimation":false,"ignore":false,"pauseAtStartup":false,"topicDependent":false,"x":2570,"y":280,"wires":[[],["e0fe7536fe452bf0"]]},{"id":"456798304142ef2f","type":"image-info","z":"d9e13201faaf6e32","name":"","x":2910,"y":280,"wires":[["68df2f4fd3353152"]]},{"id":"e0fe7536fe452bf0","type":"msg-size","z":"d9e13201faaf6e32","name":"","frequency":"sec","interval":1,"statusContent":"avg","estimation":false,"ignore":false,"pauseAtStartup":false,"humanReadableStatus":true,"topicDependent":false,"x":2740,"y":280,"wires":[[],["456798304142ef2f"]]},{"id":"4c26ba8df942c4a2","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"C:\\Users\\Gebruiker\\ffmpeg\\ffmpeg-2022-05-16-git-e3580f6077-full_build\\bin\\ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"4","restartPeriod":"4","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","x":2410,"y":260,"wires":[[],[],[],["582561fd0de6b50c"]]}]
```

Note that this flow requires some extra nodes to be installed, in order to be able to get some information about the images:
1. Start the RTSP stream, by injecting a 'start' message.
2. The RTSP node will extract the I-frames from the compressed video stream.
3. The [node-red-contrib-msg-speed](https://github.com/bartbutenaers/node-red-contrib-msg-speed) will measure the FPS, which depends on the I-frame interval on your camera and the frame rate configured in the "Images" tabsheet of the RTSP node.
4. The [node-red-contrib-msg-size](https://github.com/bartbutenaers/node-red-contrib-msg-size) node will measure the average size of the JPEG images, which may depend on a lot of factors (video quality, bit rates, I-frame interval).
5. The [node-red-contrib-image-info](https://github.com/bartbutenaers/node-red-contrib-image-info) node will show the image type and resolution.
6. The [node-red-contrib-image-output](https://github.com/rikukissa/node-red-contrib-image-output) node will show a preview of the images.

Most of these nodes can be removed as soon as everything is up and running, but can be useful while tweaking all the settings.

Remark: you can't compare the message speed with the frame rate (from the statistics output message), because the latter one is the frame rate in the compressed video...

### Stream monitoring
In most cases it will be useful to activate stream monitoring:
1. Suppose there is some kind of failure in your camera, so it stops tranferring data segments via RTSP to this node.
2. Since the stream is not stopped, this problem will stay undetected.  Indeed there is no sign of failure, except from the missing data...
3. This can solve by configuring the *"socket timeout"* setting, in the config screen:

   ![socket timeout](https://user-images.githubusercontent.com/14224149/173202535-059093ff-8e68-478d-8473-1e61b76dfa8e.png)

4. A value of 5000 (milliseconds!) means that the stream will automatically be closed by this node, as soon as it hasn't received any data in the last 5 seconds.
5. To get a grip on how often such restarts happen, have e look at the "reason" property inside the output messages (with `msg.topic` *"stopped"*) :

   ![socket timeout](https://user-images.githubusercontent.com/14224149/173202712-60767889-c697-42d4-9dbe-09ced6a14607.png)

### Get information about FFmpeg
When you have setup FFmpeg, it might be useful to get some information about FFmpeg (version number, supported decoders, ...).  All that information can be collected via the FFmpeg command line interface, but that might be not easy to access (e.g. when running Node-RED in a Docker container).  Therefore this node allows you to get some basic information from FFmpeg, simply by injecting messages into this node.

The following example flow demonstrates this:

![FFmpeg info](https://user-images.githubusercontent.com/14224149/172036051-7533349f-d09a-4570-acfd-c4a755c6f1ad.png)
```
[{"id":"68b67c2de809273d","type":"inject","z":"d9e13201faaf6e32","name":"ffmpeg version","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"version","x":2100,"y":620,"wires":[["fa1fb5de9409be66"]]},{"id":"fa1fb5de9409be66","type":"rtsp-client","z":"d9e13201faaf6e32","name":"","ffmpegPath":"ffmpeg.exe","rtspUrl":"rtsp://put_your_url_here","statisticsPeriod":"4","restartPeriod":"4","autoStart":"disable","videoCodec":"libx264","videoFrameRate":"12","videoWidth":"320","videoHeight":"240","videoQuality":"","minFragDuration":"","audioCodec":"aac","audioSampleRate":"","audioBitRate":"","transportProtocol":"udp","imageSource":"i_frames","imageFrameRate":"","imageWidth":"","imageHeight":"","socketTimeout":"","maximumDelay":"","socketBufferSize":"","reorderQueueSize":"","x":2290,"y":680,"wires":[[],["00603e3877df27b9"],[],[]]},{"id":"00603e3877df27b9","type":"debug","z":"d9e13201faaf6e32","name":"FFmpeg info","active":true,"tosidebar":true,"console":false,"tostatus":true,"complete":"true","targetType":"full","statusVal":"topic","statusType":"msg","x":2470,"y":680,"wires":[]},{"id":"44d6ad3169de2956","type":"inject","z":"d9e13201faaf6e32","name":"probe","props":[{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"probe","x":2130,"y":740,"wires":[["fa1fb5de9409be66"]]},{"id":"bab7b740de8435dc","type":"inject","z":"d9e13201faaf6e32","name":"demuxers","props":[{"p":"topic","vt":"str"},{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"demuxers","payload":"mp4","payloadType":"str","x":2120,"y":680,"wires":[["fa1fb5de9409be66"]]}]
```
1. Get the ***ffmpeg version*** by injecting a message with topic *"version"*.  The output message will not only contain the version number, but also which options were enabled when this version was build, and the versions of the major ffmpeg libraries being included in this build:

   ![ffmpeg version](https://user-images.githubusercontent.com/14224149/172036228-c610b2a1-5cc6-4e7d-b29b-dbc516d0554e.png)
   
2. Get the available ***demuxers*** from the installed FFmpeg build, by injecting a message with topic *"demuxers"*.  This is very useful to find out whether your FFmpeg supports what you need.  Note that the topic can also contain "decoders", "muxers", "encoders", "filters" and "hwaccels".  

   Moreover when a text is added in the message payload, this will act as a filter (i.e. the output message will only contain results containing that text).  For example suppose you want to decode a H.265 stream, but it doesn't work.  First thing you need to do is to verify whether your FFmpeg build supports H.265.  You can do that by injecting folliwng message:
   ```
   payload: "H.26",
   topic: "decoders"
   ```
   
   The ouput message will contain all available decoders named "xxxxH.26xxxxx":
   
   ![available decoders](https://user-images.githubusercontent.com/14224149/172036809-01efd295-6373-4d22-ae96-86b61a44b9da.png)

   Now it is immediately clear that your FFmpeg build doesn't support H.265 decoding. So you will need to use H.264 or start a custom build, where you will need to enable H.265.

3. Start a ***probe*** if you want information about your RTSP stream.  By injecting a message with topic *"probe"*, the FFprobe executable will be called to collect information about your RTSP stream:

   ![image](https://user-images.githubusercontent.com/14224149/172036887-686bb57a-179e-47f9-9b72-d8579f8597fa.png)
   
   This is very useful to make sure your RTSP stream contains the correct audio and video format.  When the output is not what you had expected, you might need to login in the web interface of your camera, to adjust the stream settings.

Note that all these output messages will appear on the "Status" output, although those messages don't contain status information.  I did this to avoid needing to have yet another output, and you problably won't need FFmpeg info often (i.e. only for troubleshooting in case of problems).

## Node properties

### General
    
#### FFmpeg path
The path to the ffmpeg executable.  This can be a full path, or simply `ffmpeg.exe` if this executable is accessibel via the system PATH.

#### RTSP url
The url wia which the RTSP stream is accessible.  

It is not always obvious where to get this url.  Some tips:
+ Search in the manual of your IP camera.
+ Search in ISpy [cam url database](https://www.ispyconnect.com/cameras/), which contains RTSP connection url' for a large amount of IP cameras.
+ Install my Onvif nodes (via command line!) an ask the URL directly from your camera, via [this](https://github.com/bartbutenaers/node-red-contrib-onvif-nodes#stream-urls) example flow. 

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

#### Stats interval
The time interval between statistic output messages (in seconds).  Note that decimals are allowed (e.g. ``2.5`).  When this field is empty, no statistics messages will be sent.

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
+ ***Copy input codec***: The output video will have the same format as the input video (i.e. no re-encoding), which can only be used in case the input video is H.264 already.  So we simply copy the H.264 video segments from the RTSP stream into the MP4 containers.
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

The most optimal scenario is that your camera stream contains AAC audio (which is the successor of MP3), because then then you *"Copy input codec"* to keep the AAC by stream copying.  That way no re-encoding is required, so only few CPU and RAM is required on your Node-RED server.  And since all major browsers support AAC, you can easily display it (e.g. by converting it to framented MP4).

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
The socket TCP I/O timeout in micro seconds.  When this field is empty, the node will keep waiting for the RTSP stream to arrive.  See the *"stream monitoring"* section above for more information about this setting.

CAUTION: In older versions of FFmpeg this option will not be available or not work correctly.  So use at least an FFmpeg build from 2022!

#### Maximum delay
A low delay value will a.o. result in the re-ordering buffer to be skipped. 

#### Socket buffer size
The maximum UDP socket receive buffer size in bytes.

#### Reorder queue size
The number of packets to buffer for handling of reordered packets.

When receiving data over UDP, the demuxer tries to reorder received packets, since they may arrive out of order (or packets may get lost totally). 

#### Trace log
Activate trace logging (i.e. detailed logging), in case you need to troubleshoot FFmpeg child process related issues.

## Troubleshooting

### No FFmpeg child process

There can be multiple reasons why the FFmpeg child process stops suddenly:
+ When the FFmpeg executable cannot be found.  Note that in this case even no child process will be spawned.
+ A timeout of the data stream.  This will only be detected if the 'timeout' has been configured.
+ Incorrect FFmpeg command line arguments.  If this node for some reason generates invalid FFmpeg command line parameters, then the FFmpeg process will be started but FFmpeg will close the child process immediately due to a parsing error.  Pretty normal that FFmpeg stops the child process, because it doesn't know what you want it to do.
+ ...

### Image smearing
An UDP buffer that is not big enough to hold an entire image I-frame, can result in ***image smearing***:

![image smearing](https://user-images.githubusercontent.com/14224149/172066242-7a489dd7-5609-433f-ac05-b8f2d530fee0.png)

If you're using a lossy transport (like UDP) then an I-frame represents "the next change it will have to repair the stream" if there are problems from packet loss.  So if the I-frame itself is incomplete (due to missing packets), then there is nothing more the FFmpeg decoder can do unfortunately.  The FFmpeg decoder tries to reconstruct the missing part of the I-frame, by repeating the last line of pixels until the bottom of the image. 

These unwanted artifacts are a disadvantage of using UDP (instead of TCP), since important packets might get lost.

### Latency
It is very annoying when the video in the dashboard has a large delay, because we would like to implement live viewing.  Take into account that a latency of 2 seconds is normal for an rtsp stream.  When playing fragmented MP4 via the hls.js player, a delay of 5 seconds is really the best you could achieve (so prefer socket.io for live streaming).

The minimum real-time delay of video running in the browser will always be based on the segment duration. So, a segment duration of 10 seconds will mean that the real-time video playback will be delayed by that much time plus the time to transfer the video from server to client and start playing it.

There can be a lot of issues that can result in larger delays.  Some tips to solve it:
1. Reduce the *I-frame interval* in the web interface of your IP camera.  Because the camera will buffer all the frames until that time interval is reached, then it will compress the frames before the H.264 segment is send to this node.  

   You could even try to set the I-frame interval (sometimes called GOP) to the lowest setting allowed.  Because when stream 'copying' is selected, the I-frame interval setting will have a direct effect on the MP4 segment duration (and we need short MP4 segments for live streaming).  For example:
   
   If FPS = 20 and I-frame interval = 40 => MP4 segments length = 2 seconds
   
   Caution: when the I-frame interval is shortened, the compression won't be optimal again (resulting in larger frame size and lower quality)!

2. Reduce the byte size of the segments.  When the bitrate is higher, this will result in bigger MP4 segments (which will take more time to travel across the network).  Therefore try to lower the quality settings to the least acceptable. Adjust this setting over and over again to get the most ooptimal setup.
MP4.

3. Try to use a decoder that decodes more quickly.  The most optimal setup is an IP camera that offers a stream with H.264 for video and AAC for audio.  Then you can select to 'copy' the audio and video in this node, so no-reencoding is required.

4. Try UDP (instead of TCP) for the transport protocol.  This might introduce artifiacts in your video, but then at least you know that the latency might be caused due to the TCP retransmission of packets, which means you have some network issues. 

6. When the ***startup latency*** is slow, this might indicate that the I-frame interval setting on your camera is too big.  The camera will only send the first segment, when the I-frame interval is reached.  So it needs an I-frame before it can start compressing the fragment.

7. Try to increase the frame rate to decrease latency.  This way packets will be sent more frequently, and it also helps FFmpeg to fill its internal buffers more quickly.  Note that the I-frame frequency will also increase, which will consume much more network bandwidth. (which affects throughput and also i-frame frequency, of course). 

### High CPU usage

1. Try to avoid having to decode the audio and video.  The most optimal setup is an IP camera that offers a stream with H.264 for video and AAC for audio.  Then you can select to 'copy' the audio and video in this node, so no-reencoding is required.

2. Try to lower the frame rate and frame resolution on your IP camera (for which your quality is still acceptable), so less data needs to be handled by this node.  If you can't lower it in your IP camera for some reasons, you can lower it in this node.  But that way of course re-encoding will be executed, resulting in much more CPU again.  So best way is to adjust this in the IP camera.

3. Try configure a pixel format in your IP camera, that matches your output format to avoid re-encoding.

### No video in the dashboard
1. Try to use a third party multimedia player (e.g. VLC), an try to connect to the camera rtsp url 
2. Try to use a third party multimedia player (e.g. VLC), an try to connect to the hls.m3u8 playlist and see how that compares to the browser. 

