import { useToasts } from '@geist-ui/core'
import useSWR, { useSWRConfig } from 'swr'
import { fetcher } from './fetcher'

export function useUpdateUser() {
  const { data } = useSWR(`/api/user`, fetcher)
  const loading = data === undefined

  const { setToast } = useToasts()
  const { mutate } = useSWRConfig()

  const updateMmr = (value) => {
    const user = { ...data, mmr: value.trim() ? parseInt(value.trim()) : null }
    const options = {
      optimisticData: user,
      rollbackOnError: true,
    }

    if (user.mmr !== null && isNaN(user.mmr)) {
      setToast({
        text: 'Please enter a number',
        type: 'error',
      })
      return
    }

    if (user.mmr > 30000) {
      setToast({
        text: 'MMR Cannot be more than 30000',
        type: 'error',
      })
      return
    }

    const updateFn = async (user) => {
      const response = await fetch(`/api/user`, {
        method: 'PATCH',
        body: JSON.stringify({ mmr: user.mmr }),
      })
      setToast({
        text: response.ok
          ? `User Updated! MMR is ${user.mmr ? `set to ${user.mmr}` : 'unset'}`
          : 'Error updating',
        type: response.ok ? 'success' : 'error',
      })

      return user
    }

    mutate(`/api/user`, updateFn(user), options)
  }

  return { user: data, updateMmr, loading }
}
