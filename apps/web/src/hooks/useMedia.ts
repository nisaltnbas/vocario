import { useEffect, useState } from 'react'

interface UseMediaReturn {
  stream: MediaStream | null
  error: Error | null
  isLoading: boolean
  startMedia: (video: boolean, audio: boolean) => Promise<void>
  stopMedia: () => void
  toggleVideo: () => void
  toggleAudio: () => void
}

export function useMedia(): UseMediaReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const startMedia = async (video: boolean, audio: boolean) => {
    try {
      setIsLoading(true)
      setError(null)

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio,
      })

      setStream(mediaStream)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }

  useEffect(() => {
    return () => {
      stopMedia()
    }
  }, [])

  return {
    stream,
    error,
    isLoading,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  }
} 
