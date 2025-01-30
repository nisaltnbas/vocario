import { useEffect, useRef, useState } from 'react'
import Peer from 'simple-peer'
import { Socket } from 'socket.io-client'

interface PeerConnection {
  peerId: string
  peer: Peer.Instance
  stream?: MediaStream
}

export function useWebRTC(
  roomId: string | null,
  socket: Socket | null,
  localStream: MediaStream | null
) {
  const [peers, setPeers] = useState<PeerConnection[]>([])
  const peersRef = useRef<PeerConnection[]>([])

  useEffect(() => {
    if (!socket || !localStream || !roomId) return

    socket.emit('join-room', roomId)

    socket.on('user-joined', ({ peerId, signal }) => {
      console.log('User joined:', peerId)
      
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: localStream,
      })

      peer.on('signal', (signal) => {
        console.log('Sending returning signal to', peerId)
        socket.emit('returning-signal', {
          signal,
          peerId,
        })
      })

      peer.on('stream', (stream) => {
        console.log('Received stream from', peerId)
        setPeers(peers => 
          peers.map(p => 
            p.peerId === peerId ? { ...p, stream } : p
          )
        )
      })

      peer.signal(signal)

      const peerConnection = {
        peerId,
        peer,
      }

      peersRef.current.push(peerConnection)
      setPeers(peers => [...peers, peerConnection])
    })

    socket.on('all-users', (users: string[]) => {
      console.log('Received all users:', users)
      
      const peers = users.map(userId => {
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: localStream,
        })

        peer.on('signal', signal => {
          console.log('Sending signal to', userId)
          socket.emit('sending-signal', {
            userToSignal: userId,
            signal,
          })
        })

        peer.on('stream', (stream) => {
          console.log('Received stream from', userId)
          setPeers(peers => 
            peers.map(p => 
              p.peerId === userId ? { ...p, stream } : p
            )
          )
        })

        return {
          peerId: userId,
          peer,
        }
      })

      peersRef.current = peers
      setPeers(peers)
    })

    socket.on('receiving-returned-signal', ({ peerId, signal }) => {
      console.log('Received returned signal from', peerId)
      const item = peersRef.current.find(p => p.peerId === peerId)
      if (item) {
        item.peer.signal(signal)
      }
    })

    socket.on('user-left', (userId: string) => {
      console.log('User left:', userId)
      const peerConnection = peersRef.current.find(p => p.peerId === userId)
      if (peerConnection) {
        peerConnection.peer.destroy()
      }
      const peers = peersRef.current.filter(p => p.peerId !== userId)
      peersRef.current = peers
      setPeers(peers)
    })

    return () => {
      console.log('Cleaning up WebRTC connections')
      socket.emit('leave-room', roomId)
      peersRef.current.forEach(peer => {
        peer.peer.destroy()
      })
      setPeers([])
      peersRef.current = []
    }
  }, [roomId, socket, localStream])

  return peers
} 