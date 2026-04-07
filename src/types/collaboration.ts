import type { CanvasElement } from './canvas';

export interface CollaborationParticipant {
  id: string;
  name: string;
  color: string;
  isSelf: boolean;
}

export type CollaborationEvent =
  | {
      type: 'session-ended';
      roomId: string;
      endedBy: string;
      endedAt: number;
    }
  | {
      type: 'element-created';
      element: string;
    }
  | {
      type: 'element-updated';
      id: string;
      element: string;
    }
  | {
      type: 'element-deleted';
      id: string;
    }
  | {
      type: 'elements-batch-updated';
      elements: string[];
      deletedIds: string[];
    }
  | {
      type: 'request-snapshot';
      requestedBy: string;
    }
  | {
      type: 'snapshot-response';
      snapshot: string;
      sentBy: string;
    };

export interface BoardSnapshot {
  elements: CanvasElement[];
  canvasBg: string;
}
