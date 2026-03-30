import { SectionTitle } from '../components/ui';
import { NetworkMap } from '../components/network/NetworkMap';

export const NetworkPage = () => (
  <div>
    <div className="px-6 pt-6">
      <SectionTitle sub="Discover and monitor devices on your local network.">
        Network Map
      </SectionTitle>
    </div>
    <NetworkMap />
  </div>
);
