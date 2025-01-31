import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRoomUsers, joinRoom, leaveRoom, RoomUser } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface UseVoiceRoomProps {
  roomId: string;
  userId: string;
  webrtcService?: any; // Replace with proper type
}

export const useVoiceRoom = ({ roomId, userId, webrtcService }: UseVoiceRoomProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleLeaveRoom = useCallback(async () => {
    if (roomId && userId) {
      try {
        await leaveRoom(roomId, userId);
        if (socket) {
          socket.emit('leave-room', { roomId, userId });
        }
        if (webrtcService) {
          webrtcService.leaveRoom();
        }
        router.push('/dashboard'); // Or wherever you want to redirect after leaving
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    }
  }, [roomId, userId, socket, webrtcService, router]);

  const handleToggleMute = useCallback(() => {
    if (webrtcService) {
      const isEnabled = webrtcService.toggleMute();
      setIsMuted(!isEnabled);
    }
  }, [webrtcService]);

  const handleToggleVideo = useCallback(() => {
    if (webrtcService) {
      const isEnabled = webrtcService.toggleVideo();
      setIsVideoOn(isEnabled);
    }
  }, [webrtcService]);

  // Update media state when webrtcService changes
  useEffect(() => {
    if (webrtcService) {
      const mediaState = webrtcService.getMediaState();
      setIsMuted(!mediaState.isAudioEnabled);
      setIsVideoOn(mediaState.isVideoEnabled);
    }
  }, [webrtcService]);

  // Handle room joining/leaving
  useEffect(() => {
    if (!roomId || !userId) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: {
        userId,
        roomId,
      },
    });

    socketInstance.on('connect', async () => {
      setIsConnecting(true);
      try {
        // Join the new room
        await joinRoom(roomId, userId);
        socketInstance.emit('join-room', { roomId, userId });
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to join room:', error);
        toast({
          title: 'Error',
          description: 'Failed to join the room. Please try again.',
          variant: 'destructive',
        });
        setIsConnecting(false);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [roomId, userId, toast]);

  // Fetch room users for the current room only
  useEffect(() => {
    const fetchRoomUsers = async () => {
      try {
        const roomUsers = await getRoomUsers(roomId);
        setUsers(roomUsers || []);
      } catch (error) {
        console.error('Failed to fetch room users:', error);
      }
    };

    if (roomId) {
      fetchRoomUsers();
      
      // Subscribe to current room changes only
      const roomUsersSubscription = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_users',
            filter: `room_id=eq.${roomId}`
          },
          async () => {
            const roomUsers = await getRoomUsers(roomId);
            setUsers(roomUsers || []);
          }
        )
        .subscribe();

      return () => {
        roomUsersSubscription.unsubscribe();
      };
    }
  }, [roomId]);

  return {
    users,
    isConnecting,
    socket,
    isMuted,
    isVideoOn,
    handleToggleMute,
    handleToggleVideo,
    handleLeaveRoom,
  };
}; 