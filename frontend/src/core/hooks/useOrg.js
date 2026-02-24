import { useOrgStore } from '../store/appStore.js'

export function useOrg() {
  const { orgs, activeOrgId, setActiveOrg, getActiveOrg, orgsLoading } = useOrgStore()
  return { orgs, activeOrgId, activeOrg: getActiveOrg(), setActiveOrg, loading: orgsLoading }
}
