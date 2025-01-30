"use client"

import { useEffect, useRef } from "react"
import { useMedia } from "../hooks/useMedia"

interface VideoPlayerProps {
  stream: MediaStream | null
  isMuted?: boolean
  username?: string
}

export function VideoPlayer({ stream, isMuted = false, username }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toggleVideo, toggleAudio, stream: mediaStream } = useMedia()

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const handleToggleVideo = () => {
    toggleVideo()
  }

  const handleToggleAudio = () => {
    toggleAudio()
  }

  const isVideoEnabled = mediaStream?.getVideoTracks()[0]?.enabled
  const isAudioEnabled = mediaStream?.getAudioTracks()[0]?.enabled

  if (!stream) {
    return (
      <div className="bg-background rounded-lg aspect-video flex items-center justify-center">
        <div className="text-muted-foreground">No video</div>
      </div>
    )
  }

  return (
    <div className="relative bg-background rounded-lg aspect-video overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
      />
      {username && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50">
          <div className="text-white text-sm font-medium">{username}</div>
        </div>
      )}
      <div className="absolute top-0 right-0 p-2 flex space-x-2">
        <button
          onClick={handleToggleVideo}
          className={`p-2 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {isVideoEnabled ? 'Camera On' : 'Camera Off'}
        </button>
        <button
          onClick={handleToggleAudio}
          className={`p-2 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {isAudioEnabled ? 'Mic On' : 'Mic Off'}
        </button>
      </div>
    </div>
  )
} 