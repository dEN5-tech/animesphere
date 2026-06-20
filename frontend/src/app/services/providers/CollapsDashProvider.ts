import type { BaseProvider } from './BaseProvider';
import type { IpcTransport } from '../../../shared/ipc/types';
import type { AnimeTitle } from '../../../shared/types';

export class CollapsDashProvider implements BaseProvider {
  id = 'collaps-dash';
  name = 'Collaps-DASH';
  private transport: IpcTransport;

  constructor(transport: IpcTransport) {
    this.transport = transport;
  }

  search(query: string): Promise<AnimeTitle[]> {
    return this.transport.call<AnimeTitle[]>('search_animevost', JSON.stringify({ query, provider: this.id }));
  }
}
