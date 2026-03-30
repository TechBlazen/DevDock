import { useAuthStore, useUserAccountsStore, DEFAULT_PREFERENCES } from '../store';
import type { UserPreferences } from '../types';

export function useUserPreferences() {
  const user = useAuthStore((s) => s.user);
  const getPreferences = useUserAccountsStore((s) => s.getPreferences);
  const updatePreferences = useUserAccountsStore((s) => s.updatePreferences);

  const prefs: UserPreferences = user ? getPreferences(user.id) : DEFAULT_PREFERENCES;

  const update = (partial: Partial<UserPreferences>) => {
    if (user) updatePreferences(user.id, partial);
  };

  return { prefs, update };
}
