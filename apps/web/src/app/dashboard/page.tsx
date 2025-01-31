"use client"

import { useEffect, useState, useRef } from "react"
import { Mic, MicOff, Video, VideoOff, Users, MessageSquare, Hash } from "lucide-react"
import { io } from "socket.io-client"
import { useMedia } from "@/hooks/useMedia"
import { VideoPlayer } from "@/components/video-player"
import { supabase } from "@/lib/supabase"
import { Room, getRoomsWithUsers, joinRoom, subscribeToAllRooms, removeFromAllRooms } from "@/lib/supabase"
import { useUser } from '@/components/providers/user-provider'
import { WebRTCService } from "@/lib/webrtc"
import { VoiceControls } from '@/components/voice-controls'
import { useVoiceRoom } from '@/hooks/useVoiceRoom'

export default function DashboardPage() {
  const { user } = useUser()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [socket, setSocket] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream | null>>(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [messages, setMessages] = useState<Map<string, Array<{ userId: string; username: string; text: string; timestamp: number }>>>(new Map())
  const [messageInput, setMessageInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const webrtcRef = useRef<WebRTCService>(new WebRTCService())

  const {
    stream: localStream,
    isLoading,
    error,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  } = useMedia()

  const {
    users,
    isConnecting,
    socket: voiceSocket,
    isMuted,
    isVideoOn,
    handleToggleMute,
    handleToggleVideo,
    handleLeaveRoom,
  } = useVoiceRoom({
    roomId: selectedRoom?.id || '',
    userId: user?.id || '',
    webrtcService: webrtcRef.current,
  });

  // Cleanup function to remove user from all rooms
  const cleanup = async () => {
    if (user) {
      console.log('Cleaning up user data...');
      try {
        await removeFromAllRooms(user.id);
        setSelectedRoom(null);
        webrtcRef.current.cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  };

  useEffect(() => {
    // Socket.io bağlantısını kur
    const newSocket = io("http://localhost:3001")
    setSocket(newSocket)

    // Chat mesajlarını dinle
    newSocket.on('chat-message', ({ roomId, userId, username, text, timestamp }) => {
      setMessages(prev => {
        const newMessages = new Map(prev)
        const roomMessages = newMessages.get(roomId) || []
        newMessages.set(roomId, [...roomMessages, { userId, username, text, timestamp }])
        return newMessages
      })
    })

    // Oda mesaj geçmişini al
    newSocket.on('chat-history', ({ messages }) => {
      if (messages && messages.length > 0) {
        const roomId = messages[0].roomId
        setMessages(prev => {
          const newMessages = new Map(prev)
          newMessages.set(roomId, messages)
          return newMessages
        })
      }
    })

    // Kullanıcı bilgilerini al
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setCurrentUser(session.user)
      }
    }
    getUser()

    // Add cleanup on page unload
    const handleBeforeUnload = () => {
      if (user) {
        removeFromAllRooms(user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      newSocket.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    }
  }, [user])

  // Watch for user changes (login/logout)
  useEffect(() => {
    if (!user) {
      setSelectedRoom(null);
      setRooms([]);
      webrtcRef.current.cleanup();
    }
  }, [user]);

  // Initial room fetch and subscription setup
  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      console.log('Fetching initial rooms...')
      try {
        const roomsData = await getRoomsWithUsers()
        console.log('Initial rooms data:', roomsData)
        setRooms(roomsData)
      } catch (error) {
        console.error('Failed to fetch initial rooms:', error)
      }
    }

    fetchRooms()

    // Subscribe to all room changes
    console.log('Setting up room subscription...')
    const unsubscribe = subscribeToAllRooms((updatedRooms) => {
      console.log('Received rooms update:', updatedRooms)
      setRooms(updatedRooms)
      
      // Update selected room if it exists in the updated rooms
      if (selectedRoom) {
        const updatedSelectedRoom = updatedRooms.find(room => room.id === selectedRoom.id)
        if (updatedSelectedRoom) {
          setSelectedRoom(updatedSelectedRoom)
        }
      }
    })

    return () => {
      console.log('Cleaning up room subscription...')
      unsubscribe()
    }
  }, [user])

  // Handle WebRTC when room or stream changes
  useEffect(() => {
    if (!selectedRoom || !socket || !user || !localStream) return;

    // Initialize WebRTC
    webrtcRef.current.initialize(socket, selectedRoom.id, user.id);
    webrtcRef.current.setLocalStream(localStream);

    // Join room in socket.io
    socket.emit('join-room', { roomId: selectedRoom.id, userId: user.id });

    // Update peer streams when they change
    const interval = setInterval(() => {
      const streams = webrtcRef.current.getPeerStreams();
      setPeerStreams(prevStreams => {
        const newStreams = new Map(prevStreams);
        streams.forEach((stream, peerId) => {
          newStreams.set(peerId, stream);
        });
        return newStreams;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (selectedRoom) {
        socket.emit('leave-room', { roomId: selectedRoom.id, userId: user.id });
      }
    };
  }, [selectedRoom, socket, user, localStream]);

  // Oda seçildiğinde medya akışını başlat
  useEffect(() => {
    if (selectedRoom) {
      startMedia(true, true)
    } else {
      stopMedia()
    }
  }, [selectedRoom])

  // Otomatik scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedRoom || !currentUser || !socket) return

    const messageData = {
      roomId: selectedRoom.id,
      userId: currentUser.id,
      username: currentUser.user_metadata.username,
      text: messageInput.trim(),
      timestamp: Date.now()
    }

    // Mesajı socket üzerinden gönder
    socket.emit('chat-message', messageData)

    // Input'u temizle
    setMessageInput("")
  }

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
      <div className="w-64 bg-muted/30 rounded-lg p-4 flex flex-col">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Voice Rooms
        </h2>
        <div className="space-y-4 flex-1">
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

        {/* Voice controls at the bottom of channels */}
        {selectedRoom && (
          <div className="pt-4 border-t mt-4">
            <VoiceControls
              isMuted={isMuted}
              isVideoOn={isVideoOn}
              onToggleMute={handleToggleMute}
              onToggleVideo={() => {
                handleToggleVideo();
                setIsVideoEnabled(!isVideoEnabled);
              }}
              onLeaveRoom={handleLeaveRoom}
            />
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="flex-1 bg-muted/30 rounded-lg flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat {currentRoom?.name ? `- ${currentRoom.name}` : ''}
          </h2>
        </div>
        
        {/* Chat Messages Area */}
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {selectedRoom && messages.get(selectedRoom.id)?.map((message, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${
                message.userId === currentUser?.id 
                  ? 'bg-primary text-primary-foreground ml-auto' 
                  : 'bg-background'
              } max-w-[80%]`}
            >
              <p className="text-sm font-medium">{message.username}</p>
              <p className="text-sm">{message.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full p-2 rounded-md bg-background"
          />
        </form>
      </div>

      {/* Video Section - Only show when enabled */}
      {isVideoEnabled && selectedRoom && (
        <div className="w-96 bg-muted/30 rounded-lg p-4 flex flex-col">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video
          </h2>
          <div className="flex-1 space-y-4">
            {localStream && (
              <VideoPlayer
                stream={localStream}
                isMuted={true}
                username={currentUser?.user_metadata?.username + " (You)"}
              />
            )}
            {Array.from(peerStreams).map(([peerId, stream]) => {
              const peerUser = currentRoom?.users.find(u => u.id === peerId)
              return stream && (
                <VideoPlayer
                  key={peerId}
                  stream={stream}
                  username={peerUser?.profile.username}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 