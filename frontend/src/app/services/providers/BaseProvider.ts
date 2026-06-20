import type { AnimeTitle } from '../../../shared/types';

export interface BaseProvider {
  id: string;
  name: string;
  search(query: string): Promise<AnimeTitle[]>;
}
