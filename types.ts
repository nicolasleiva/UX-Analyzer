
export enum AppState {
  IDLE,
  INITIALIZING,
  CALIBRATING,
  TRACKING,
  VIEWING_RESULTS,
  ERROR
}

export interface GazePoint {
  x: number;
  y: number;
}
