import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const HubSpotIdentification = () => {
  const { data, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && data?.user?.email && window._hsq) {
      // Identify the visitor in HubSpot
      window._hsq.push(['identify', {
        email: data.user.email,
        name: data.user.name
      }]);
    }
  }, [status, data?.user?.email, data?.user?.name]);

  return null;
}

export default HubSpotIdentification;
