import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PeerConnection {
  userId: string
  connection: RTCPeerConnection
  stream?: MediaStream
}

export const useWebRTC = (roomId: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map())
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoOff, setIsVideoOff] = useState(true)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, PeerConnection>>(new Map())

  // Initialize media stream
  const initializeMedia = async (audio: boolean, video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      return null
    }
  }

  // Create peer connection
  const createPeerConnection = async (targetUserId: string) => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }

    const pc = new RTCPeerConnection(config)
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current)
        }
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from('webrtc_signals').insert({
          room_id: roomId,
          from_user_id: userId,
          to_user_id: targetUserId,
          type: 'ice_candidate',
          signal: JSON.stringify(event.candidate)
        })
      }
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const connection = peersRef.current.get(targetUserId)
      if (connection) {
        connection.stream = event.streams[0]
        setPeers(new Map(peersRef.current))
      }
    }

    return pc
  }

  // Handle incoming signals
  useEffect(() => {
    const channel = supabase
      .channel(`webrtc_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const { from_user_id, to_user_id, type, signal } = payload.new

        if (to_user_id !== userId) return

        let pc = peersRef.current.get(from_user_id)?.connection

        if (!pc) {
          pc = await createPeerConnection(from_user_id)
          peersRef.current.set(from_user_id, { userId: from_user_id, connection: pc })
          setPeers(new Map(peersRef.current))
        }

        if (type === 'offer') {
          await pc.setRemoteDescription(JSON.parse(signal))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await supabase.from('webrtc_signals').insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: from_user_id,
            type: 'answer',
            signal: JSON.stringify(answer)
          })
        } else if (type === 'answer') {
          await pc.setRemoteDescription(JSON.parse(signal))
        } else if (type === 'ice_candidate') {
          await pc.addIceCandidate(JSON.parse(signal))
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, userId])

  // Initialize call with a peer
  const initiateCall = async (targetUserId: string) => {
    const pc = await createPeerConnection(targetUserId)
    peersRef.current.set(targetUserId, { userId: targetUserId, connection: pc })
    setPeers(new Map(peersRef.current))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await supabase.from('webrtc_signals').insert({
      room_id: roomId,
      from_user_id: userId,
      to_user_id: targetUserId,
      type: 'offer',
      signal: JSON.stringify(offer)
    })
  }

  // Toggle audio/video
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      // Stop all media tracks
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      
      // Close all peer connections
      peersRef.current.forEach(peer => peer.connection.close());
      
      // Clean up WebRTC signals
      if (roomId) {
        void supabase.rpc('delete_old_signals');
      }
    };
  }, [roomId]);

  return {
    localStream,
    peers,
    isMuted,
    isVideoOff,
    initializeMedia,
    initiateCall,
    toggleAudio,
    toggleVideo
  }
} 