import { UploadResult } from '../../lib/storage';
import { TemplateData } from '../../lib/database';

export interface TransitionPairConfig {
  transitionId: string;
  songA: UploadResult;
  songB: UploadResult;
  songAIndex: number;
  songBIndex: number;
  selectedTemplate: TemplateData | null;
  directCut: boolean;
  transitionDuration: number;
}
