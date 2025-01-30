"use client"

import { useEffect, useState } from 'react';
import { VoiceRooms } from '@/components/voice-rooms';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUserId(session.user.id);
      }
    };

    checkUser();
  }, [router]);

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <VoiceRooms userId={userId} />
    </div>
  );
} 