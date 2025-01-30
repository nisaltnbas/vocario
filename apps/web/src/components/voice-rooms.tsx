import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import { Room, getRoomsWithUsers, RoomUser, joinRoom, leaveRoom } from '@/lib/supabase';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';

interface VoiceRoomsProps {
  userId: string;
}

export function VoiceRooms({ userId }: VoiceRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const {
    localStream,
    peers,
    isMuted,
    isVideoOff,
    initializeMedia,
    initiateCall,
    toggleAudio,
    toggleVideo
  } = useWebRTC(activeRoom || '', userId);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsData = await getRoomsWithUsers();
        setRooms(roomsData);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch rooms',
          variant: 'destructive',
        });
      }
    };

    fetchRooms();

    // Realtime subscription for room updates
    const roomsSubscription = supabase
      .channel('rooms_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_users'
        },
        async () => {
          const updatedRooms = await getRoomsWithUsers();
          setRooms(updatedRooms);
        }
      )
      .subscribe();

    return () => {
      roomsSubscription.unsubscribe();
    };
  }, []);

  // Set up video elements for peers
  useEffect(() => {
    peers.forEach((peer, userId) => {
      if (peer.stream) {
        const videoElement = videoRefs.current.get(userId);
        if (videoElement && videoElement.srcObject !== peer.stream) {
          videoElement.srcObject = peer.stream;
        }
      }
    });
  }, [peers]);

  const handleJoinRoom = async (roomId: string) => {
    try {
      setIsJoining(true);

      if (activeRoom === roomId) {
        // Leave current room
        await leaveRoom(roomId, userId);
        setActiveRoom(null);
        
        // Stop media streams
        localStream?.getTracks().forEach(track => track.stop());
      } else {
        // Leave current room if any
        if (activeRoom) {
          await leaveRoom(activeRoom, userId);
          localStream?.getTracks().forEach(track => track.stop());
        }

        // Initialize media before joining
        await initializeMedia(true, true);
        
        // Join new room
        await joinRoom(roomId, userId);
        setActiveRoom(roomId);

        // Initialize calls with existing users in the room
        const currentRoom = rooms.find(r => r.id === roomId);
        if (currentRoom) {
          currentRoom.users
            .filter(u => u.user_id !== userId)
            .forEach(user => initiateCall(user.user_id));
        }
      }

      // Refresh rooms
      const updatedRooms = await getRoomsWithUsers();
      setRooms(updatedRooms);
    } catch (error) {
      console.error('Failed to join/leave room:', error);
      toast({
        title: 'Error',
        description: 'Failed to join/leave room',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <User className="w-5 h-5" />
        Voice Rooms
      </h2>

      <div className="space-y-4">
        {rooms.map((room) => {
          const isActive = activeRoom === room.id;
          const isUserInRoom = room.users.some(user => user.user_id === userId);
          
          return (
            <div key={room.id} className="space-y-2">
              <div
                className={`flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg ${
                  isActive ? 'bg-primary/10' : ''
                }`}
                onClick={() => !isJoining && handleJoinRoom(room.id)}
              >
                <div className="flex items-center gap-2">
                  {isUserInRoom ? (
                    <Mic className="w-4 h-4 text-green-500" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                  <span className="font-medium">{room.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {room.users.length} users
                </span>
              </div>

              {isActive && (
                <div className="pl-6 space-y-4">
                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleAudio}
                      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {isMuted ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                    <button
                      onClick={toggleVideo}
                      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {isVideoOff ? (
                        <VideoOff className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                  </div>

                  {/* Video grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Local video */}
                    {localStream && (
                      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        <video
                          ref={el => {
                            if (el) el.srcObject = localStream;
                          }}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                          You
                        </div>
                      </div>
                    )}

                    {/* Remote videos */}
                    {Array.from(peers.values()).map((peer) => (
                      <div key={peer.userId} className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        <video
                          ref={el => {
                            if (el) {
                              videoRefs.current.set(peer.userId, el);
                              if (peer.stream) el.srcObject = peer.stream;
                            }
                          }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                          {room.users.find(u => u.user_id === peer.userId)?.profile.username}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* User list */}
                  <div className="space-y-1">
                    {room.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between text-sm p-1"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className={user.user_id === userId ? 'font-medium' : ''}>
                            {user.profile.username}
                            {user.user_id === userId && ' (You)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.isMuted ? (
                            <MicOff className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Mic className="w-3 h-3 text-green-500" />
                          )}
                          {user.isVideoOn ? (
                            <Video className="w-3 h-3 text-green-500" />
                          ) : (
                            <VideoOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 