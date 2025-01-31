import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sdyluadtpplivjcwlurn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkeWx1YWR0cHBsaXZqY3dsdXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzExNDgsImV4cCI6MjA1MzgwNzE0OH0.GohbMiavvVBY9GS5nTIoJnLAkkZtUkNj4qB0HDxD0KA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Types
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomUser {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  profile: Profile;
  isInCall: boolean;
  isVideoOn: boolean;
  isMuted: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: 'GENERAL' | 'GAMING' | 'MUSIC';
  users: RoomUser[];
}

interface DatabaseRoomUser {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  };
}

// Realtime subscriptions
export const subscribeToRoom = (roomId: string, callback: (users: RoomUser[]) => void) => {
  // Subscribe to room_users changes
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
        // Fetch latest room users when any change occurs
        const { data: roomUsers, error } = await supabase
          .from('room_users')
          .select(`
            id,
            room_id,
            user_id,
            joined_at,
            profile:profiles!inner (
              id,
              username,
              avatar_url,
              created_at,
              updated_at
            )
          `) as { data: DatabaseRoomUser[] | null; error: any };

        if (error) {
          console.error('Error fetching updated room users:', error);
          return;
        }

        if (!roomUsers) {
          console.log('No room users found');
          callback([]);
          return;
        }

        // Transform and send to callback
        const users = roomUsers
          .filter(user => user.room_id === roomId)
          .map(user => ({
            id: user.id,
            room_id: user.room_id,
            user_id: user.user_id,
            joined_at: user.joined_at,
            profile: user.profile,
            isInCall: true,
            isVideoOn: false,
            isMuted: true
          }));

        callback(users);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    roomUsersSubscription.unsubscribe();
  };
};

export const subscribeToAllRooms = (callback: (rooms: Room[]) => void) => {
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
        // Fetch all rooms and their users when any change occurs
        const rooms = await getRoomsWithUsers();
        callback(rooms);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    roomUsersSubscription.unsubscribe();
  };
};

// Profile functions
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Room functions
export const getRoomsWithUsers = async (): Promise<Room[]> => {
  try {
    console.log('Starting to fetch rooms and users...');

    // First get all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at');

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      throw roomsError;
    }
    if (!rooms) return [];

    console.log('Fetched rooms:', rooms);

    // Then get all room users with their profiles
    const { data: roomUsers, error: usersError } = await supabase
      .from('room_users')
      .select(`
        id,
        room_id,
        user_id,
        joined_at,
        profile:profiles!inner (
          id,
          username,
          avatar_url,
          created_at,
          updated_at
        )
      `) as { data: DatabaseRoomUser[] | null; error: any };

    if (usersError) {
      console.error('Error fetching room users:', usersError);
      throw usersError;
    }

    console.log('Fetched room users:', roomUsers);

    // Transform the data to match our Room interface
    const roomsWithUsers = rooms.map(room => {
      const usersInRoom = (roomUsers || [])
        .filter(user => user.room_id === room.id)
        .map(user => ({
          id: user.id,
          room_id: user.room_id,
          user_id: user.user_id,
          joined_at: user.joined_at,
          profile: user.profile,
          isInCall: true,
          isVideoOn: false,
          isMuted: true
        }));

      console.log(`Users in room ${room.name}:`, usersInRoom);

      return {
        id: room.id,
        name: room.name,
        type: room.type as Room['type'],
        users: usersInRoom
      };
    });

    console.log('Final transformed rooms:', roomsWithUsers);
    return roomsWithUsers;
  } catch (error) {
    console.error('Failed to get rooms with users:', error);
    throw error;
  }
};

export const joinRoom = async (roomId: string, userId: string): Promise<RoomUser> => {
  try {
    console.log('Attempting to join room:', { roomId, userId });

    // 1. Leave all other rooms first
    const { error: deleteError } = await supabase
      .from('room_users')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error leaving other rooms:', deleteError);
      throw deleteError;
    }

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }
    if (!profile) {
      throw new Error('Profile not found');
    }

    console.log('Found user profile:', profile);

    // 3. Insert room_user record
    const { data: roomUser, error: insertError } = await supabase
      .from('room_users')
      .upsert({
        room_id: roomId,
        user_id: userId,
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'room_id,user_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error joining room:', insertError);
      throw insertError;
    }
    if (!roomUser) {
      throw new Error('Failed to join room');
    }

    console.log('Successfully joined room:', roomUser);

    // 4. Return formatted room user
    const result: RoomUser = {
      id: roomUser.id,
      room_id: roomId,
      user_id: userId,
      joined_at: roomUser.joined_at,
      profile: profile,
      isInCall: true,
      isVideoOn: false,
      isMuted: true
    };

    console.log('Returning result:', result);
    return result;
  } catch (error) {
    console.error('Failed to join room:', error);
    throw error;
  }
};

export const leaveRoom = async (roomId: string, userId: string) => {
  try {
    console.log('Attempting to leave room:', { roomId, userId });
    
    const { error } = await supabase
      .from('room_users')
      .delete()
      .match({ room_id: roomId, user_id: userId });

    if (error) {
      console.error('Error leaving room:', error);
      throw error;
    }

    console.log('Successfully left room');
  } catch (error) {
    console.error('Failed to leave room:', error);
    throw error;
  }
};

export const removeFromAllRooms = async (userId: string) => {
  try {
    console.log('Removing user from all rooms:', userId);
    
    const { error } = await supabase
      .from('room_users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing user from rooms:', error);
      throw error;
    }

    console.log('Successfully removed user from all rooms');
  } catch (error) {
    console.error('Failed to remove user from rooms:', error);
    throw error;
  }
}; 