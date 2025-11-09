import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useNavTransition() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      router.prefetch(href);
      router.push(href);
    },
    [router]
  );

  return { navigate };
}
