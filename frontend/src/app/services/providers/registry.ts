import type { IpcTransport } from '../../../shared/ipc/types';
import type { BaseProvider } from './BaseProvider';
import { AnimeVostProvider } from './AnimeVostProvider';
import { AnimeGoProvider } from './AnimeGoProvider';
import { JutSuProvider } from './JutSuProvider';
import { ShikimoriProvider } from './ShikimoriProvider';
import { AniLibertyProvider } from './AniLibertyProvider';
import { CollapsProvider } from './CollapsProvider';
import { CollapsDashProvider } from './CollapsDashProvider';
import { KodikProvider } from './KodikProvider';
import { anime } from '../../../shared/proto/anime';

export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map();

  constructor(transport: IpcTransport) {
    const wrappedTransport: IpcTransport = {
      call: async <T>(action: string, payload: string = ""): Promise<T> => {
        const res = await transport.call<any>(action, payload);
        if (action === 'search_animevost' && typeof res === 'string') {
          const binary = new Uint8Array(res.length);
          for (let i = 0; i < res.length; i++) {
            binary[i] = res.charCodeAt(i);
          }
          const decoded = anime.AnimeListResponse.decode(binary);
          const mapped = (decoded.animes || []).map((a: any) => ({
            id: a.id || 0,
            title: a.title || "",
            description: a.description || "",
            cover_image: a.coverImage || "",
          }));
          return mapped as unknown as T;
        }
        return res as T;
      }
    };

    this.register(new AnimeVostProvider(wrappedTransport));
    this.register(new AnimeGoProvider(wrappedTransport));
    this.register(new JutSuProvider(wrappedTransport));
    this.register(new ShikimoriProvider(wrappedTransport));
    this.register(new AniLibertyProvider(wrappedTransport));
    this.register(new CollapsProvider(wrappedTransport));
    this.register(new CollapsDashProvider(wrappedTransport));
    this.register(new KodikProvider(wrappedTransport));
  }

  register(provider: BaseProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: string): BaseProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }
}
