import type { BaseProvider } from './BaseProvider';
import type { IpcTransport } from '../../../shared/ipc/types';
import type { AnimeTitle } from '../../../shared/types';

export class ShikimoriProvider implements BaseProvider {
  id = 'shikimori';
  name = 'Shikimori';
  private transport: IpcTransport;

  constructor(transport: IpcTransport) {
    this.transport = transport;
  }

  search(query: string): Promise<AnimeTitle[]> {
    return this.transport.call<AnimeTitle[]>('search_animevost', JSON.stringify({ query, provider: this.id }));
  }
}
