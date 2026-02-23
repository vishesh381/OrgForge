import { useEffect } from 'react'
import { useOrgStore } from '../store/appStore.js'
import { useApi } from './useApi.js'

export function useOrg() {
  const { orgs, activeOrgId, setOrgs, setActiveOrg, getActiveOrg } = useOrgStore()
  const { get, loading } = useApi()

  useEffect(() => {
    if (orgs.length === 0) {
      get('/orgs')
        .then((data) => {
          setOrgs(data)
          if (data.length > 0 && !activeOrgId) setActiveOrg(data[0].orgId)
        })
        .catch(() => {})
    }
  }, [])

  return { orgs, activeOrgId, activeOrg: getActiveOrg(), setActiveOrg, loading }
}
