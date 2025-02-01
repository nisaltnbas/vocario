import { useEffect, useState, useRef } from 'react'

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
  const streamRef = useRef<MediaStream | null>(null)

  const startMedia = async (video: boolean, audio: boolean) => {
    try {
      setIsLoading(true)
      setError(null)

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: audio ? {
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true,
        } : false,
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
  }

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks()
        
        if (document.hidden) {
          // When page is hidden, only disable video tracks if they exist
          const videoTrack = tracks.find(track => track.kind === 'video')
          if (videoTrack) {
            videoTrack.enabled = false
          }
        } else {
          // When page becomes visible again, restore previous track states
          tracks.forEach(track => {
            if (track.kind === 'video') {
              track.enabled = true
            }
            // Audio tracks remain in their current state
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
