'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  entrar,
  obterUsuarioAtual,
  sair,
  type Profile,
  type User,
} from '../lib/auth';

// A interface depende deste hook; apenas lib/auth conhece o armazenamento mock.
export function useSession(page: string) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    obterUsuarioAtual()
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        if (!current && page !== 'login') router.replace('/login');
        else if (current && page === 'login') router.replace('/');
        else setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, attempt, router]);

  async function login(profile: Profile) {
    setBusy(true);
    try {
      await entrar(profile);
      router.replace('/');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await sair();
      setUser(null);
      router.replace('/login');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setLoading(true);
    setError(false);
    setAttempt((value) => value + 1);
  }

  return { user, loading, error, busy, login, logout, retry };
}
