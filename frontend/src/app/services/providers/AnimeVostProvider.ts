import type { BaseProvider } from './BaseProvider';
import type { IpcTransport } from '../../../shared/ipc/types';
import type { AnimeTitle } from '../../../shared/types';

export class AnimeVostProvider implements BaseProvider {
  id = 'animevost';
  name = 'AnimeVost';
  private transport: IpcTransport;

  constructor(transport: IpcTransport) {
    this.transport = transport;
  }

  search(query: string): Promise<AnimeTitle[]> {
    return this.transport.call<AnimeTitle[]>('search_animevost', JSON.stringify({ query, provider: this.id }));
  }
}
