import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { profile } = useAuth();

  const org = useMemo(() => {
    if (!profile) return null;
    return profile.organizations || {
      id: profile.org_id,
      name: '',
      slug: '',
    };
  }, [profile]);

  const value = {
    org,
    orgId: profile?.org_id ?? org?.id ?? null,
    orgName: org?.name ?? '',
    orgSlug: org?.slug ?? '',
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
