import { Copy, Link2, Power, Radio, Users, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useUiStore } from '../stores/useUiStore';
import type { CollaborationParticipant } from '../types/collaboration';

interface CollaborationControlsProps {
  roomId: string | null;
  shareUrl: string | null;
  participants: CollaborationParticipant[];
  canStop: boolean;
  connectionLabel: string;
  isStarting: boolean;
  isStopping: boolean;
  onStartSession: () => Promise<void>;
  onStopSession: () => Promise<void>;
}

export function CollaborationControls({
  roomId,
  shareUrl,
  participants,
  canStop,
  connectionLabel,
  isStarting,
  isStopping,
  onStartSession,
  onStopSession,
}: CollaborationControlsProps) {
  const displayName = useCollaborationStore((state) => state.displayName);
  const modalOpen = useCollaborationStore((state) => state.modalOpen);
  const sessionMessage = useCollaborationStore((state) => state.sessionMessage);
  const setDisplayName = useCollaborationStore((state) => state.setDisplayName);
  const setModalOpen = useCollaborationStore((state) => state.setModalOpen);
  const setSessionMessage = useCollaborationStore((state) => state.setSessionMessage);
  const showToast = useUiStore((state) => state.showToast);

  const trimmedName = displayName.trim();
  const participantCount = participants.length;
  const title = roomId ? `Live (${participantCount || 1})` : 'Live';
  const primaryActionLabel = roomId ? 'Join session' : 'Start session';
  const canSubmitIdentity = trimmedName.length > 0;

  const participantSummary = useMemo(() => {
    if (!participants.length) {
      return 'No one else is here yet.';
    }

    return `${participants.length} participant${participants.length === 1 ? '' : 's'} online`;
  }, [participants]);

  const copyShareLink = async (): Promise<void> => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied');
    } catch {
      showToast('Copy the share link from the field.');
    }
  };

  const submitPrimaryAction = async (): Promise<void> => {
    if (!canSubmitIdentity) {
      setSessionMessage('Enter your name before starting or joining a session.');
      return;
    }

    setSessionMessage(null);

    if (roomId) {
      setModalOpen(false);
      return;
    }

    await onStartSession();
  };

  return (
    <>
      <button
        className={`icon-btn collaboration-btn ${roomId ? 'active' : ''}`}
        type="button"
        title="Live collaboration"
        onClick={() => setModalOpen(true)}
      >
        <Radio size={16} />
        {title}
      </button>

      <div className={`collab-overlay ${modalOpen ? 'show' : ''}`}>
        <div className="popup-box collaboration-modal">
          <div className="popup-header">
            <span>Live Collaboration</span>
            <button
              className="popup-close"
              type="button"
              aria-label="Close collaboration dialog"
              onClick={() => setModalOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="popup-content collaboration-content">
            {sessionMessage ? (
              <div className="collaboration-message" role="status">
                <span>{sessionMessage}</span>
                <button
                  type="button"
                  className="collaboration-message-close"
                  aria-label="Dismiss message"
                  onClick={() => setSessionMessage(null)}
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            <label className="collaboration-field">
              <span className="prop-label">Your Name</span>
              <input
                className="collaboration-input"
                type="text"
                value={displayName}
                maxLength={48}
                placeholder="Type your name"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

            {roomId ? (
              <>
                <div className="collaboration-status-row">
                  <span className="collaboration-status">
                    <Users size={14} />
                    {participantSummary}
                  </span>
                  <span className="collaboration-connection">{connectionLabel}</span>
                </div>

                <label className="collaboration-field">
                  <span className="prop-label">Share Link</span>
                  <div className="collaboration-link-row">
                    <input
                      className="collaboration-input collaboration-link-input"
                      type="text"
                      readOnly
                      value={shareUrl ?? ''}
                    />
                    <button
                      className="icon-btn collaboration-inline-btn"
                      type="button"
                      onClick={copyShareLink}
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </label>

                {shareUrl ? (
                  <div className="collaboration-qr-block">
                    <div className="collaboration-qr-frame">
                      <QRCodeSVG
                        value={shareUrl}
                        size={132}
                        bgColor="#fffef9"
                        fgColor="#1a1a2e"
                        includeMargin
                      />
                    </div>
                    <div className="collaboration-qr-text">
                      Scan this QR code or share the link directly.
                    </div>
                  </div>
                ) : null}

                <div className="collaboration-participants">
                  {participants.map((participant) => (
                    <div key={participant.id} className="collaboration-participant">
                      <span
                        className="collaboration-participant-dot"
                        style={{ backgroundColor: participant.color }}
                      />
                      <span>
                        {participant.name}
                        {participant.isSelf ? ' (You)' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="collaboration-actions">
                  {!trimmedName ? (
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={submitPrimaryAction}
                    >
                      <Link2 size={14} />
                      {primaryActionLabel}
                    </button>
                  ) : null}

                  {canStop ? (
                    <button
                      className="icon-btn danger"
                      type="button"
                      disabled={isStopping}
                      onClick={() => {
                        void onStopSession();
                      }}
                    >
                      <Power size={14} />
                      {isStopping ? 'Stopping…' : 'Stop Session'}
                    </button>
                  ) : (
                    <div className="collaboration-host-note">
                      Only the host can stop this session.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="collaboration-actions">
                <button
                  className="icon-btn"
                  type="button"
                  disabled={!canSubmitIdentity || isStarting}
                  onClick={() => {
                    void submitPrimaryAction();
                  }}
                >
                  <Radio size={14} />
                  {isStarting ? 'Starting…' : primaryActionLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
