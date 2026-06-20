import { createContext } from 'preact';
import type { RenderableProps } from 'preact';
import { useContext } from 'preact/hooks';
import { container } from './container';
import type { ServiceContainer } from './container';

const ServiceContext = createContext<ServiceContainer>(container);

export const ServiceProvider = ({ children }: RenderableProps<{}>) => {
  return (
    <ServiceContext.Provider value={container}>
      {children}
    </ServiceContext.Provider>
  );
};

export function useServices(): ServiceContainer {
  return useContext(ServiceContext);
}
