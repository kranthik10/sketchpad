import type { IUserInfo, JsonObject, LsonObject } from '@liveblocks/client';
import type { CanvasElement } from './canvas';

export interface CollaborationPresence extends JsonObject {
  cursor: {
    x: number;
    y: number;
  } | null;
  selectedIds: string[];
  lockedElementIds: string[];
}

export interface CollaborationStorage extends LsonObject {
  snapshot: string;
}

export interface CollaborationUserInfo extends IUserInfo, JsonObject {
  name?: string;
  color?: string;
}

export interface CollaborationUserMeta {
  info?: CollaborationUserInfo;
}

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
      element: string; // JSON-stringified CanvasElement
    }
  | {
      type: 'element-updated';
      id: string;
      element: string; // JSON-stringified CanvasElement
    }
  | {
      type: 'element-deleted';
      id: string;
    }
  | {
      type: 'elements-batch-updated';
      elements: string[]; // JSON-stringified CanvasElement[]
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
