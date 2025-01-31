"use client"

import { useEffect, useState } from "react"
import { Mic, MicOff, Video, VideoOff, Users, MessageSquare, Hash } from "lucide-react"
import { io } from "socket.io-client"
import { useMedia } from "@/hooks/useMedia"
import { useWebRTC } from "@/hooks/useWebRTC"
import { VideoPlayer } from "@/components/video-player"
import { supabase } from "@/lib/supabase"
import { Room, getRoomsWithUsers, joinRoom, subscribeToRoom } from "@/lib/supabase"
import { useUser } from '@/components/providers/user-provider'

export default function DashboardPage() {
  const { user } = useUser()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [socket, setSocket] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [rooms, setRooms] = useState<Room[]>([])

  const {
    stream: localStream,
    isLoading,
    error,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  } = useMedia()

  const { peers } = useWebRTC(selectedRoom?.id || '', currentUser?.id || '')

  useEffect(() => {
    // Socket.io bağlantısını kur
    const newSocket = io("http://localhost:3001")
    setSocket(newSocket)

    // Kullanıcı bilgilerini al
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setCurrentUser(session.user)
      }
    }
    getUser()

    return () => {
      newSocket.close()
    }
  }, [])

  useEffect(() => {
    const fetchRooms = async () => {
      console.log('Fetching rooms...')
      try {
        const roomsData = await getRoomsWithUsers()
        console.log('Rooms data:', roomsData)
        setRooms(roomsData)
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
      }
    }

    fetchRooms()
  }, [])

  useEffect(() => {
    if (!selectedRoom) return

    console.log('Subscribing to room:', selectedRoom.id)
    const unsubscribe = subscribeToRoom(selectedRoom.id, (updatedUsers) => {
      console.log('Received room update:', updatedUsers)
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === selectedRoom.id 
            ? { ...room, users: updatedUsers }
            : room
        )
      )
    })

    return () => {
      console.log('Unsubscribing from room:', selectedRoom.id)
      unsubscribe()
    }
  }, [selectedRoom])

  // Oda seçildiğinde medya akışını başlat
  useEffect(() => {
    if (selectedRoom) {
      startMedia(true, true)
    } else {
      stopMedia()
    }
  }, [selectedRoom])

  const handleRoomClick = async (room: Room) => {
    if (!user) return
    
    try {
      console.log('Joining room:', room.id)
      await joinRoom(room.id, user.id)
      setSelectedRoom(room)
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }

  const currentRoom = rooms.find(room => room.id === selectedRoom?.id)

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Rooms List */}
      <div className="w-64 bg-muted/30 rounded-lg p-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Voice Rooms
        </h2>
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="space-y-2">
              <button
                onClick={() => handleRoomClick(room)}
                className={`w-full p-2 flex items-center gap-2 rounded-md cursor-pointer transition-colors ${
                  selectedRoom?.id === room.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                }`}
              >
                <Hash className="h-4 w-4" />
                <span>{room.name}</span>
                {room.users.length > 0 && (
                  <span className="ml-auto text-xs bg-primary/10 px-2 py-1 rounded-full">
                    {room.users.length}
                  </span>
                )}
              </button>

              {/* Users in room */}
              {room.users.length > 0 && (
                <div className="pl-6 space-y-1">
                  {room.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{user.profile.username}</span>
                      {user.isMuted && <MicOff className="h-3 w-3 ml-auto" />}
                      {user.isVideoOn && <Video className="h-3 w-3" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedRoom ? (
        <div className="flex-1 flex flex-col bg-muted/30 rounded-lg">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4 p-4">
            {/* Local Video */}
            <VideoPlayer
              stream={localStream}
              isMuted={true}
              username={`${currentUser?.user_metadata?.username || 'You'} (You)`}
            />

            {/* Remote Videos */}
            {Array.from(peers.values()).map((peer) => (
              <VideoPlayer
                key={peer.userId}
                stream={peer.stream || null}
                username={`User ${peer.userId}`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="h-20 border-t bg-background p-4 flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full ${
                !localStream?.getAudioTracks()[0]?.enabled
                  ? "bg-destructive"
                  : "bg-primary"
              } text-white hover:opacity-90`}
            >
              {!localStream?.getAudioTracks()[0]?.enabled ? <MicOff /> : <Mic />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${
                !localStream?.getVideoTracks()[0]?.enabled
                  ? "bg-destructive"
                  : "bg-primary"
              } text-white hover:opacity-90`}
            >
              {!localStream?.getVideoTracks()[0]?.enabled ? <VideoOff /> : <Video />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a room to join the conversation
        </div>
      )}

      {/* Chat Messages */}
      {selectedRoom && (
        <div className="w-80 bg-muted/30 rounded-lg flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat - {currentRoom?.name}
            </h2>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-auto">
            <div className="bg-background p-3 rounded-lg">
              <p className="text-sm font-medium">User 1</p>
              <p className="text-sm">Hello everyone!</p>
            </div>
            <div className="bg-background p-3 rounded-lg">
              <p className="text-sm font-medium">User 2</p>
              <p className="text-sm">Hi there!</p>
            </div>
          </div>
          <div className="p-4 border-t">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full p-2 rounded-md bg-background"
            />
          </div>
        </div>
      )}
    </div>
  )
} 