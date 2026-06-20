import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as animeEntity from '../../anime';
import * as uiStore from '../../ui/model/store';
import { container } from '../../../shared/di/container';
import {
  activeMedia, seekingValue, resumeInfo, lastSavedTime,
  playbackState
} from './store';
import type { ResumeInfo } from './store';

export function playAnime(id: number, resumeInfoVal?: Omit<ResumeInfo, 'episode_id' | 'time_pos'>) {
  container.playbackService.playStream(id)
    .then((streamInfo: any) => {
      jotaiStore.set(activeMedia, streamInfo.title);
      jotaiStore.set(seekingValue, null);
      if (resumeInfoVal) {
        jotaiStore.set(resumeInfo, {
          episode_id: id,
          time_pos: 0,
          episode_title: streamInfo.title,
          anime_title: resumeInfoVal.anime_title,
          cover_image: resumeInfoVal.cover_image,
          description: resumeInfoVal.description,
        });
      } else {
        jotaiStore.set(resumeInfo, {
          episode_id: id,
          time_pos: 0,
          episode_title: streamInfo.title,
          anime_title: streamInfo.title,
          cover_image: '',
          description: '',
        });
      }
      jotaiStore.set(lastSavedTime, -1);
    })
    .catch((err: any) => {
      jotaiStore.set(uiStore.globalError, 'Playback initialization failed: ' + err);
    });
}

export function persistResume(timePos: number) {
  const info = jotaiStore.get(resumeInfo);
  if (!info || info.episode_id < 0) return;
  if (Math.abs(timePos - jotaiStore.get(lastSavedTime)) < 5) return;
  jotaiStore.set(lastSavedTime, timePos);
  const state = jotaiStore.get(playbackState);
  container.playbackService.saveResume(JSON.stringify({
    ...info,
    time_pos: timePos,
    duration: state.duration,
  })).catch(() => {});
}

export function stopAnime() {
  const info = jotaiStore.get(resumeInfo);
  const state = jotaiStore.get(playbackState);
  if (info) persistResume(state.time_pos);
  jotaiStore.set(activeMedia, null);
  jotaiStore.set(seekingValue, null);
  jotaiStore.set(resumeInfo, null);
  jotaiStore.set(lastSavedTime, -1);
  if (jotaiStore.get(animeEntity.searchQuery).trim() === '') {
    container.libraryService.getHistory()
      .then((ts: any) => { jotaiStore.set(animeEntity.titles, ts); })
      .catch((err: any) => { jotaiStore.set(uiStore.globalError, "Failed to retrieve history: " + err); });
  }
  container.playbackService.stop()
    .catch((err: any) => { jotaiStore.set(uiStore.globalError, 'Stop command failed: ' + err); });
}
