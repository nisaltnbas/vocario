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

  // Fetch all room users initially and on changes
  useEffect(() => {
    const fetchRoomUsers = async () => {
      try {
        const allRoomUsers = await getRoomUsers('');
        setUsers(allRoomUsers || []);
      } catch (error) {
        console.error('Failed to fetch room users:', error);
      }
    };

    fetchRoomUsers();
    
    // Subscribe to room_users changes
    const roomUsersSubscription = supabase
      .channel('room_users_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_users'
        },
        async () => {
          const allRoomUsers = await getRoomUsers('');
          setUsers(allRoomUsers || []);
        }
      )
      .subscribe();

    return () => {
      roomUsersSubscription.unsubscribe();
    };
  }, []);

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
          await leaveRoom(room.room_id, userId);
        }
        
        // Join the new room
        await joinRoom(roomId, userId);
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
        leaveRoom(roomId, userId).catch(console.error);
      }
      socketInstance.disconnect();
    };
  }, [roomId, userId, toast, users]);

  return {
    users,
    isConnecting,
    socket,
  };
}; 