"use client"

import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  stream: MediaStream | null
  isMuted?: boolean
  username?: string
}

export function VideoPlayer({ stream, isMuted = false, username }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

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
    </div>
  )
} 