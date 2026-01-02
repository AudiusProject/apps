import devDistributors from '../distributors/dev.json'
import prodDistributors from '../distributors/prod.json'
import { useMemo } from 'react'

const env = import.meta.env.VITE_ENVIRONMENT as 'dev' | 'prod'

export const useDistributors = () => {
  const distributors = useMemo(() => {
    switch (env) {
      case 'dev':
        return devDistributors.distributors
      case 'prod':
        return prodDistributors.distributors
    }
  }, [])
  return distributors
}
