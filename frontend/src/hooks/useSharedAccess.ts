import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface ShareInfo {
  id: string;
  token: string;
  resourceType: string;
  resourceId?: string;
  permission: 'viewer' | 'editor';
  effectivePermission?: 'viewer' | 'editor';
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface AccessInfo {
  canEdit: boolean;
  canView: boolean;
  shareInfo?: ShareInfo;
}

export function useSharedAccess(resourceType?: string) {
  const searchParams = useSearchParams();
  const [accessInfo, setAccessInfo] = useState<AccessInfo>({
    canEdit: true,
    canView: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const shareToken = searchParams?.get('share');
    
    if (shareToken) {
      setIsLoading(true);
      
      // Получаем ID текущего пользователя
      const username = localStorage.getItem('username');
      if (!username) {
        setIsLoading(false);
        return;
      }
      
      fetch('/api/auth/me', {
        headers: { 'x-username': username }
      })
        .then(res => res.json())
        .then(userData => {
          const userId = userData.id;
          
          // Проверяем доступ по токену с учетом userId
          return fetch(`/api/share/token/${shareToken}?user_id=${userId}`);
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.isActive) {
            const effectivePerm = data.effectivePermission || data.permission;
            setAccessInfo({
              canEdit: effectivePerm === 'editor',
              canView: true,
              shareInfo: data
            });
          } else {
            setAccessInfo({
              canEdit: false,
              canView: false
            });
          }
        })
        .catch(error => {
          console.error('Error loading share info:', error);
          setAccessInfo({
            canEdit: false,
            canView: false
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [searchParams]);

  return { accessInfo, isLoading };
}
