import { Home, Search, History, Bookmark, Settings, Users, Terminal } from 'lucide-preact';
import { HomeTab, HistoryTab, BookmarksTab } from '../features/library';
import { SearchTab } from '../features/search';
import { SettingsTab } from '../features/settings';
import { FriendsTab } from '../features/friends';
import { LogsTab } from '../features/logs';
import type { ComponentType } from 'preact';

export interface TabDefinition {
  id: 'home' | 'search' | 'history' | 'bookmarks' | 'settings' | 'friends' | 'logs';
  label: string;
  icon: any;
  component: ComponentType<any>;
}

export const tabRegistry: TabDefinition[] = [
  {
    id: 'home',
    label: 'Главная',
    icon: Home,
    component: HomeTab,
  },
  {
    id: 'search',
    label: 'Поиск',
    icon: Search,
    component: SearchTab,
  },
  {
    id: 'history',
    label: 'История',
    icon: History,
    component: HistoryTab,
  },
  {
    id: 'bookmarks',
    label: 'Закладки',
    icon: Bookmark,
    component: BookmarksTab,
  },
  {
    id: 'friends',
    label: 'Друзья',
    icon: Users,
    component: FriendsTab,
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    component: SettingsTab,
  },
  {
    id: 'logs',
    label: 'Логи',
    icon: Terminal,
    component: LogsTab,
  },
];
