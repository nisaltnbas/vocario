'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  friends: FriendRequest[];
  pendingRequests: FriendRequest[];
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  loadFriends: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  friends: [],
  pendingRequests: [],
  sendFriendRequest: async () => {},
  acceptFriendRequest: async () => {},
  rejectFriendRequest: async () => {},
  loadFriends: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  const loadFriends = async () => {
    if (!user) return;

    // Load accepted friendships
    const { data: friendsData, error: friendsError } = await supabase
      .from('friendships')
      .select('*')
      .or('sender_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
      .eq('status', 'ACCEPTED');

    if (friendsError) {
      console.error('Error loading friends:', friendsError);
      return;
    }

    // Load pending friend requests (both sent and received)
    const { data: pendingData, error: pendingError } = await supabase
      .from('friendships')
      .select('*')
      .or('sender_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
      .eq('status', 'PENDING');

    if (pendingError) {
      console.error('Error loading pending requests:', pendingError);
      return;
    }

    setFriends(friendsData || []);
    setPendingRequests(pendingData || []);
  };

  const sendFriendRequest = async (username: string) => {
    if (!user) return;

    try {
      // Check if trying to add self
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileData?.username === username) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Get the user ID for the username
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Check if friend request already exists
      const { data: existingRequest } = await supabase
        .from('friendships')
        .select('*')
        .or(
          'and(sender_id.eq.' + user.id + ',receiver_id.eq.' + userData.id + '),' +
          'and(sender_id.eq.' + userData.id + ',receiver_id.eq.' + user.id + ')'
        );

      if (existingRequest && existingRequest.length > 0) {
        const existing = existingRequest[0];
        if (existing.status === 'PENDING') {
          throw new Error('Friend request already pending');
        } else if (existing.status === 'ACCEPTED') {
          throw new Error('Already friends with this user');
        }
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          sender_id: user.id,
          receiver_id: userData.id,
          status: 'PENDING',
        });

      if (insertError) {
        console.error('Error sending friend request:', insertError);
        throw new Error('Failed to send friend request');
      }

      await loadFriends();
    } catch (error: any) {
      console.error('Error in sendFriendRequest:', error);
      throw error;
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .update({ status: 'ACCEPTED' })
      .eq('id', requestId)
      .eq('receiver_id', user.id);

    await loadFriends();
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .update({ status: 'REJECTED' })
      .eq('id', requestId)
      .eq('receiver_id', user.id);

    await loadFriends();
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        friends,
        pendingRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        loadFriends,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 