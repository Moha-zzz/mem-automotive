import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut as supabaseSignOut } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await getCurrentUser();
        if (user) {
          setUser(user);
        } else {
          // No user, redirect to login
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const signOut = async () => {
    await supabaseSignOut();
    router.push('/auth/login');
  };

  return { user, loading, signOut };
}
