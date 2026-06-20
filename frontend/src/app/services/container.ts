import { container } from '../../shared/di/container';
import { LibraryServiceImpl } from './LibraryService';
import { PlaybackServiceImpl } from './PlaybackService';
import { SettingsServiceImpl } from './SettingsService';
import { transport } from '../../shared/ipc';

container.libraryService = new LibraryServiceImpl(transport);
container.playbackService = new PlaybackServiceImpl(transport);
container.settingsService = new SettingsServiceImpl(transport);

export { container };
export type { ServiceContainer } from '../../shared/di/container';
