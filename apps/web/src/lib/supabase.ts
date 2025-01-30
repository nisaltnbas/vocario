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
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at');

  if (roomsError) throw roomsError;
  if (!rooms) return [];

  const { data: roomUsers, error: usersError } = await supabase
    .from('room_users')
    .select(`
      id,
      room_id,
      user_id,
      joined_at,
      profiles!inner (*)
    `);

  if (usersError) throw usersError;

  return rooms.map(room => ({
    id: room.id,
    name: room.name,
    type: room.type as Room['type'],
    users: ((roomUsers || []) as any[])
      .filter(user => user.room_id === room.id)
      .map(user => ({
        id: user.id,
        room_id: user.room_id,
        user_id: user.user_id,
        joined_at: user.joined_at,
        profile: user.profiles,
        isInCall: true,
        isVideoOn: false,
        isMuted: true
      }))
  }));
};

export const joinRoom = async (roomId: string, userId: string) => {
  const { error } = await supabase
    .from('room_users')
    .upsert({ room_id: roomId, user_id: userId });

  if (error) throw error;
};

export const leaveRoom = async (roomId: string, userId: string) => {
  const { error } = await supabase
    .from('room_users')
    .delete()
    .match({ room_id: roomId, user_id: userId });

  if (error) throw error;
}; 