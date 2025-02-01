'use client';

import { useState, useEffect } from 'react';
import { useUser } from './providers/user-provider';
import { Button } from './ui/button';
import { Input } from '@/components/ui/input';
import { toast } from './ui/use-toast';
import { supabase } from '@/lib/supabase';

export function FriendsList() {
  const { user, friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useUser();
  const [username, setUsername] = useState('');
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadUsernames = async () => {
      const userIds = new Set<string>();
      
      // Collect all user IDs from friends and requests
      friends.forEach(friend => {
        userIds.add(friend.sender_id);
        userIds.add(friend.receiver_id);
      });
      
      pendingRequests.forEach(request => {
        userIds.add(request.sender_id);
        userIds.add(request.receiver_id);
      });

      // Remove current user's ID
      if (user) {
        userIds.delete(user.id);
      }

      // Fetch usernames for all IDs
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));

      if (data) {
        const usernameMap: Record<string, string> = {};
        data.forEach(profile => {
          usernameMap[profile.id] = profile.username;
        });
        setUsernames(usernameMap);
      }
    };

    loadUsernames();
  }, [friends, pendingRequests, user]);

  const handleSendRequest = async () => {
    try {
      await sendFriendRequest(username);
      toast({
        title: 'Friend request sent',
        description: `Friend request sent to ${username}`,
      });
      setUsername('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send friend request',
        variant: 'destructive',
      });
    }
  };

  const getOtherUserId = (friend: any) => {
    if (!user) return '';
    return friend.sender_id === user.id ? friend.receiver_id : friend.sender_id;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Add Friend</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <Button onClick={handleSendRequest}>Send Request</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Friend Requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-muted-foreground">No pending friend requests</p>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <span>{usernames[request.sender_id] || 'Loading...'}</span>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => acceptFriendRequest(request.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectFriendRequest(request.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-muted-foreground">No friends yet</p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                <span>{usernames[getOtherUserId(friend)] || 'Loading...'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 