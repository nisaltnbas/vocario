import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRoomUsers, joinRoom, leaveRoom, RoomUser } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface UseVoiceRoomProps {
  roomId: string;
  userId: string;
}

export const useVoiceRoom = ({ roomId, userId }: UseVoiceRoomProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

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
        // Leave any existing rooms first
        const currentRooms = users.filter(u => u.user_id === userId);
        for (const room of currentRooms) {
          if (room.room_id !== roomId) {  // Only leave other rooms
            await leaveRoom(room.room_id, userId);
            // Emit leave-room event to clean up WebRTC connections
            socketInstance.emit('leave-room', { roomId: room.room_id, userId });
          }
        }
        
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
      if (roomId && userId) {
        // Clean up the current room before unmounting
        leaveRoom(roomId, userId).catch(console.error);
        socketInstance.emit('leave-room', { roomId, userId });
      }
      socketInstance.disconnect();
    };
  }, [roomId, userId, toast, users]);

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
  };
}; 