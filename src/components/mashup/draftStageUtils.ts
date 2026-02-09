import { TransitionData } from '../../lib/transitionsService';

export type DraftStage = 'songs' | 'clips' | 'templates' | 'complete';

export interface DraftStageInfo {
  currentStage: number;
  stageName: string;
  stageKey: DraftStage;
  availableStages: number[];
  totalStages: number;
}

export const STAGE_LABELS: Record<number, { name: string; key: DraftStage; description: string }> = {
  1: {
    name: 'Choose Songs',
    key: 'songs',
    description: 'Select tracks for your mash up'
  },
  2: {
    name: 'Clip Songs',
    key: 'clips',
    description: 'Set clip start and end points'
  },
  3: {
    name: 'Choose Template',
    key: 'templates',
    description: 'Select transition templates'
  },
};

export function getDraftStageProgress(transitions: TransitionData[]): DraftStageInfo {
  if (!transitions || transitions.length === 0) {
    return {
      currentStage: 1,
      stageName: STAGE_LABELS[1].name,
      stageKey: 'songs',
      availableStages: [1],
      totalStages: 3,
    };
  }

  const explicitStage = transitions[0].metadata?.draftStage as DraftStage | undefined;

  if (explicitStage) {
    return getStageInfoFromKey(explicitStage, transitions);
  }

  return detectStageFromData(transitions);
}

function getStageInfoFromKey(stageKey: DraftStage, transitions: TransitionData[]): DraftStageInfo {
  const stageMap: Record<DraftStage, number> = {
    songs: 1,
    clips: 2,
    templates: 3,
    complete: 3,
  };

  const currentStage = stageMap[stageKey] || 1;
  const availableStages = getAvailableStagesFromData(transitions);

  return {
    currentStage,
    stageName: STAGE_LABELS[currentStage]?.name || 'Choose Songs',
    stageKey,
    availableStages,
    totalStages: 3,
  };
}

function detectStageFromData(transitions: TransitionData[]): DraftStageInfo {
  const hasAllTemplates = transitions.every(t => t.templateId !== null);
  const hasAllClipMarkers = transitions.every(t =>
    t.songAClipStart !== undefined &&
    t.songAClipStart !== null &&
    t.songBClipEnd !== undefined &&
    t.songBClipEnd !== null
  );
  const hasSongs = transitions.every(t => t.songAId && t.songBId);

  let currentStage = 1;
  let stageKey: DraftStage = 'songs';

  if (hasAllTemplates) {
    currentStage = 3;
    stageKey = 'complete';
  } else if (hasAllClipMarkers) {
    currentStage = 3;
    stageKey = 'templates';
  } else if (hasSongs) {
    currentStage = 2;
    stageKey = 'clips';
  }

  const availableStages = getAvailableStagesFromData(transitions);

  return {
    currentStage,
    stageName: STAGE_LABELS[currentStage]?.name || 'Choose Songs',
    stageKey,
    availableStages,
    totalStages: 3,
  };
}

function getAvailableStagesFromData(transitions: TransitionData[]): number[] {
  const available: number[] = [1];

  const hasSongs = transitions.every(t => t.songAId && t.songBId);
  if (hasSongs) {
    available.push(2);
  }

  const hasAllClipMarkers = transitions.every(t =>
    t.songAClipStart !== undefined &&
    t.songAClipStart !== null &&
    t.songBClipEnd !== undefined &&
    t.songBClipEnd !== null
  );

  if (hasAllClipMarkers) {
    available.push(3);
  }

  return available;
}

export function getUnavailableReason(stage: number, availableStages: number[]): string | null {
  if (availableStages.includes(stage)) {
    return null;
  }

  switch (stage) {
    case 2:
      return 'Select songs first to access this step';
    case 3:
      return 'Complete the Clip Songs step first';
    default:
      return 'Complete previous steps first';
  }
}

export function getResetWarningMessage(targetStage: number, currentStage: number): string | null {
  if (targetStage >= currentStage) {
    return null;
  }

  switch (targetStage) {
    case 1:
      return 'Going back to Choose Songs will reset your clip points and template selections.';
    case 2:
      return 'Going back to Clip Songs will reset your template selections.';
    default:
      return null;
  }
}

export function mapStageToCreatorStep(stage: number): string {
  switch (stage) {
    case 1:
      return 'select-songs';
    case 2:
      return 'set-transition-points';
    case 3:
      return 'set-templates';
    default:
      return 'select-songs';
  }
}
