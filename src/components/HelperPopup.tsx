import { useUiStore } from '../stores/useUiStore';

export function HelperPopup() {
  const helperOpen = useUiStore((state) => state.helperOpen);
  const setHelperOpen = useUiStore((state) => state.setHelperOpen);

  if (!helperOpen) {
    return null;
  }

  return (
    <div id="helper-overlay" className="show" role="dialog" aria-modal="true">
      <div className="popup-box">
        <div className="popup-header">
          <span>Help &amp; Shortcuts</span>
          <button
            className="popup-close"
            type="button"
            aria-label="Close helper"
            onClick={() => setHelperOpen(false)}
          >
            &#10005;
          </button>
        </div>
        <div className="popup-content">
          <p>
            <b>P</b> Pencil &nbsp; <b>L</b> Line &nbsp; <b>R</b> Rect
          </p>
          <p>
            <b>E</b> Ellipse &nbsp; <b>A</b> Arrow &nbsp; <b>T</b> Text
          </p>
          <p>
            <b>S</b> Select &nbsp; <b>H</b> Pan &nbsp; <b>X</b> Eraser
          </p>
          <p>
            <b>Ctrl+Z</b> Undo &nbsp; <b>Ctrl+Y</b> Redo
          </p>
          <p>
            <b>Scroll</b> Zoom &nbsp; <b>Del</b> Delete sel.
          </p>
          <hr className="popup-divider" />
          <p>
            <b>Canvas Editor:</b> Use the properties panel to change tool colors,
            stroke size, fill color, and overall element opacity dynamically as
            you draw.
          </p>
        </div>
      </div>
    </div>
  );
}
