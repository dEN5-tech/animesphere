import type { RenderableProps } from 'preact';
import { Provider as JotaiProvider } from 'jotai';
import { ServiceProvider } from '../../shared/di/context';
import { jotaiStore } from '../../shared/store/jotaiStore';

export function AppProviders({ children }: RenderableProps<{}>) {
  return (
    <JotaiProvider store={jotaiStore}>
      <ServiceProvider>
        {children}
      </ServiceProvider>
    </JotaiProvider>
  );
}
