export type ExportFormat = 'pdf' | 'png';

export interface ExportProgressState {
  active: boolean;
  format: ExportFormat;
  status: 'running' | 'success' | 'error';
  progress: number;
  message: string;
  stage?: string;
}
