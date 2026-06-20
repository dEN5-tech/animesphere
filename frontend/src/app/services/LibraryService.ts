import type { IpcTransport } from '../../shared/ipc/types';
import type { Anime, AnimeTitle } from '../../shared/types';
import { ProviderRegistry } from './providers/registry';
import { anime } from '../../shared/proto/anime';

export interface LibraryService {
  fetchCatalog(): Promise<Anime[]>;
  getHistory(): Promise<AnimeTitle[]>;
  selectAnime(title: AnimeTitle): Promise<any>;
  searchAnimeVost(query: string): Promise<AnimeTitle[]>;
  searchProvider(query: string, providerId: string): Promise<AnimeTitle[]>;
  searchAll(query: string): Promise<any[]>;
  importAnimeVost(val: string): Promise<any>;
}

export class LibraryServiceImpl implements LibraryService {
  private transport: IpcTransport;
  private registry: ProviderRegistry;

  constructor(transport: IpcTransport) {
    this.transport = transport;
    this.registry = new ProviderRegistry(transport);
  }

  async fetchCatalog(): Promise<Anime[]> {
    const res = await this.transport.call<string | Anime[]>("fetch_catalog");
    if (typeof res === "string") {
      const binary = new Uint8Array(res.length);
      for (let i = 0; i < res.length; i++) {
        binary[i] = res.charCodeAt(i);
      }
      const decoded = anime.AnimeListResponse.decode(binary);
      return (decoded.animes || []).map((a: any) => ({
        id: a.id || 0,
        title: a.title || "",
        description: a.description || "",
        cover_image: a.coverImage || "",
      }));
    }
    return res;
  }

  async getHistory(): Promise<AnimeTitle[]> {
    const res = await this.transport.call<string | AnimeTitle[]>("get_history");
    if (typeof res === "string") {
      const binary = new Uint8Array(res.length);
      for (let i = 0; i < res.length; i++) {
        binary[i] = res.charCodeAt(i);
      }
      const decoded = anime.AnimeListResponse.decode(binary);
      return (decoded.animes || []).map((a: any) => ({
        id: a.id || 0,
        title: a.title || "",
        description: a.description || "",
        cover_image: a.coverImage || "",
      }));
    }
    return res;
  }

  selectAnime(title: AnimeTitle): Promise<any> {
    return this.transport.call<any>("select_anime", JSON.stringify(title));
  }

  async searchAnimeVost(query: string): Promise<AnimeTitle[]> {
    const res = await this.transport.call<string | AnimeTitle[]>("search_animevost", query);
    if (typeof res === "string") {
      const binary = new Uint8Array(res.length);
      for (let i = 0; i < res.length; i++) {
        binary[i] = res.charCodeAt(i);
      }
      const decoded = anime.AnimeListResponse.decode(binary);
      return (decoded.animes || []).map((a: any) => ({
        id: a.id || 0,
        title: a.title || "",
        description: a.description || "",
        cover_image: a.coverImage || "",
      }));
    }
    return res;
  }

  searchProvider(query: string, providerId: string): Promise<AnimeTitle[]> {
    const provider = this.registry.get(providerId);
    if (provider) {
      return provider.search(query);
    }
    // Fallback if provider is not in registry
    return this.searchAnimeVost(query);
  }

  async searchAll(query: string): Promise<any[]> {
    const providers = this.registry.getAll();
    // Exclude metadata-only provider (Shikimori) from video search aggregator
    const videoProviders = providers.filter(p => p.id !== 'shikimori');
    
    const searchPromises = videoProviders.map(p => 
      p.search(query)
        .then(results => results.map(item => ({ 
          ...item, 
          provider: p.name 
        })))
        .catch(err => {
          console.error(`Search query failed for provider ${p.id}:`, err);
          return [];
        })
    );
    
    const allResults = await Promise.all(searchPromises);
    return allResults.flat();
  }

  importAnimeVost(val: string): Promise<any> {
    return this.transport.call<any>("import_animevost", val);
  }
}
