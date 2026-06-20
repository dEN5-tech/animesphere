export interface ServiceContainer {
  libraryService: any;
  playbackService: any;
  settingsService: any;
}

export const container: ServiceContainer = {
  libraryService: null as any,
  playbackService: null as any,
  settingsService: null as any,
};
