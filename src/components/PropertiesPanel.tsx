import { Copy, CornerDownRight, Square, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import type {
  ArrowType,
  ArrowheadStyle,
  CanvasElement,
  FontFamily,
  ShapeFillStyle,
  Sloppiness,
  StrokeStyle,
  TextAlign,
} from '../types/canvas';

const strokeSwatches = [
  '#1a1a2e',
  '#e8503a',
  '#3a7be8',
  '#2dbe6c',
  '#f0a500',
  '#9b59b6',
];

const fillSwatches = ['#1a1a2e22', '#e8503a33', '#3a7be833', '#2dbe6c33'];
const strokeSizes = [2, 6, 12];
const fillStyles: ShapeFillStyle[] = ['hachure', 'cross-hatch', 'solid'];
const strokeStyles: StrokeStyle[] = ['solid', 'dashed', 'dotted'];
const sloppinessLevels: Sloppiness[] = ['architect', 'artist', 'cartoonist'];
const arrowTypes: ArrowType[] = ['straight', 'curve', 'elbow'];
const fontFamilies: FontFamily[] = [
  'Caveat, cursive',
  'sans-serif',
  'DM Mono, monospace',
];
const textAlignments: TextAlign[] = ['left', 'center', 'right'];
const arrowheadStyles: ArrowheadStyle[] = ['arrow', 'none', 'triangle', 'bar'];

export function PropertiesPanel() {
  const activeTool = useUiStore((state) => state.activeTool);
  const defaultColor = useUiStore((state) => state.color);
  const defaultFill = useUiStore((state) => state.fill);
  const defaultSize = useUiStore((state) => state.size);
  const defaultOpacity = useUiStore((state) => state.opacity);
  const defaultEdges = useUiStore((state) => state.edges);
  const defaultFillStyle = useUiStore((state) => state.fillStyle);
  const defaultStrokeStyle = useUiStore((state) => state.strokeStyle);
  const defaultSloppiness = useUiStore((state) => state.sloppiness);
  const defaultArrowType = useUiStore((state) => state.arrowType);
  const defaultEndArrowhead = useUiStore((state) => state.endArrowhead);
  const defaultFontFamily = useUiStore((state) => state.fontFamily);
  const defaultTextAlign = useUiStore((state) => state.textAlign);
  const defaultFontSize = useUiStore((state) => state.fontSize);
  const setColor = useUiStore((state) => state.setColor);
  const setFill = useUiStore((state) => state.setFill);
  const setSize = useUiStore((state) => state.setSize);
  const setOpacity = useUiStore((state) => state.setOpacity);
  const setEdges = useUiStore((state) => state.setEdges);
  const setFillStyle = useUiStore((state) => state.setFillStyle);
  const setStrokeStyle = useUiStore((state) => state.setStrokeStyle);
  const setSloppiness = useUiStore((state) => state.setSloppiness);
  const setArrowType = useUiStore((state) => state.setArrowType);
  const setEndArrowhead = useUiStore((state) => state.setEndArrowhead);
  const setFontFamily = useUiStore((state) => state.setFontFamily);
  const setTextAlign = useUiStore((state) => state.setTextAlign);
  const setFontSize = useUiStore((state) => state.setFontSize);
  const showToast = useUiStore((state) => state.showToast);

  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const deleteSelection = useCanvasStore((state) => state.deleteSelection);
  const duplicateSelection = useCanvasStore((state) => state.duplicateSelection);

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds],
  );
  const singleSelectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  const inspectorMode = activeTool === 'select' && selectedElements.length > 0;
  const panelTypes = inspectorMode
    ? selectedElements.map((element) => element.type)
    : [activeTool];

  if (!inspectorMode && ['select', 'pan', 'eraser'].includes(activeTool)) {
    return null;
  }

  if (!panelTypes.length) {
    return null;
  }

  const currentColor = singleSelectedElement?.color ?? defaultColor;
  const currentFill =
    singleSelectedElement && 'fill' in singleSelectedElement
      ? singleSelectedElement.fill ?? defaultFill
      : defaultFill;
  const currentSize = singleSelectedElement?.size ?? defaultSize;
  const currentOpacity = singleSelectedElement?.opacity ?? defaultOpacity;
  const currentEdges =
    singleSelectedElement?.type === 'rect' ? singleSelectedElement.edges : defaultEdges;
  const currentFillStyle =
    singleSelectedElement &&
    'fillStyle' in singleSelectedElement &&
    singleSelectedElement.fillStyle
      ? singleSelectedElement.fillStyle
      : defaultFillStyle;
  const currentStrokeStyle =
    singleSelectedElement &&
    'strokeStyle' in singleSelectedElement &&
    singleSelectedElement.strokeStyle
      ? singleSelectedElement.strokeStyle
      : defaultStrokeStyle;
  const currentSloppiness =
    singleSelectedElement &&
    'sloppiness' in singleSelectedElement &&
    singleSelectedElement.sloppiness
      ? singleSelectedElement.sloppiness
      : defaultSloppiness;
  const currentArrowType =
    singleSelectedElement &&
    (singleSelectedElement.type === 'line' || singleSelectedElement.type === 'arrow')
      ? singleSelectedElement.arrowType
      : defaultArrowType;
  const currentEndArrowhead =
    singleSelectedElement?.type === 'arrow'
      ? singleSelectedElement.endArrowhead
      : defaultEndArrowhead;
  const currentFontFamily =
    singleSelectedElement?.type === 'text'
      ? singleSelectedElement.fontFamily
      : defaultFontFamily;
  const currentTextAlign =
    singleSelectedElement?.type === 'text'
      ? singleSelectedElement.textAlign
      : defaultTextAlign;
  const currentFontSize =
    singleSelectedElement?.type === 'text'
      ? singleSelectedElement.fontSize
      : defaultFontSize;

  const showSize = panelTypes.some((type) =>
    ['rect', 'ellipse', 'line', 'arrow', 'text', 'pencil'].includes(type),
  );
  const showFill = panelTypes.some((type) => ['rect', 'ellipse'].includes(type));
  const showOpacity = panelTypes.some((type) =>
    ['rect', 'ellipse', 'line', 'arrow', 'text', 'pencil'].includes(type),
  );
  const showAdvanced = panelTypes.some((type) =>
    ['rect', 'ellipse', 'line', 'arrow'].includes(type),
  );
  const showArrowType = panelTypes.some((type) => ['line', 'arrow'].includes(type));
  const showArrowheads = panelTypes.some((type) => type === 'arrow');
  const showEdges = panelTypes.some((type) => type === 'rect');
  const showTextProps = panelTypes.some((type) => type === 'text');

  const updateSelectedElements = (
    updater: (element: CanvasElement) => CanvasElement,
  ): void => {
    if (!selectedElements.length) {
      return;
    }

    const nextElements = elements.map((element) =>
      selectedIds.includes(element.id) ? updater(element) : element,
    );
    commitHistory(nextElements);
  };

  const applyColor = (value: string): void => {
    if (inspectorMode) {
      updateSelectedElements((element) => ({ ...element, color: value }));
      return;
    }
    setColor(value);
  };

  const applyFill = (value: string): void => {
    if (inspectorMode) {
      updateSelectedElements((element) => ('fill' in element ? { ...element, fill: value } : element));
      return;
    }
    setFill(value);
  };

  const applyFillStyle = (value: ShapeFillStyle): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'rect' || element.type === 'ellipse'
          ? { ...element, fillStyle: value }
          : element,
      );
      return;
    }
    setFillStyle(value);
  };

  const applySize = (value: number): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'text' ? { ...element, size: value } : { ...element, size: value },
      );
      return;
    }
    setSize(value);
  };

  const applyStrokeStyle = (value: StrokeStyle): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'rect' ||
        element.type === 'ellipse' ||
        element.type === 'line' ||
        element.type === 'arrow'
          ? { ...element, strokeStyle: value }
          : element,
      );
      return;
    }
    setStrokeStyle(value);
  };

  const applySloppiness = (value: Sloppiness): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'rect' ||
        element.type === 'ellipse' ||
        element.type === 'line' ||
        element.type === 'arrow'
          ? { ...element, sloppiness: value }
          : element,
      );
      return;
    }
    setSloppiness(value);
  };

  const applyArrowType = (value: ArrowType): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'line' || element.type === 'arrow'
          ? { ...element, arrowType: value }
          : element,
      );
      return;
    }
    setArrowType(value);
  };

  const applyEdges = (value: 'sharp' | 'round'): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'rect' ? { ...element, edges: value } : element,
      );
      return;
    }
    setEdges(value);
  };

  const applyEndArrowhead = (value: ArrowheadStyle): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'arrow' ? { ...element, endArrowhead: value } : element,
      );
      return;
    }
    setEndArrowhead(value);
  };

  const applyFontFamily = (value: FontFamily): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'text' ? { ...element, fontFamily: value } : element,
      );
      return;
    }
    setFontFamily(value);
  };

  const applyTextAlign = (value: TextAlign): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'text' ? { ...element, textAlign: value } : element,
      );
      return;
    }
    setTextAlign(value);
  };

  const applyFontSize = (value: number): void => {
    if (inspectorMode) {
      updateSelectedElements((element) =>
        element.type === 'text' ? { ...element, fontSize: value } : element,
      );
      return;
    }
    setFontSize(value);
  };

  const applyOpacity = (value: number): void => {
    if (inspectorMode) {
      updateSelectedElements((element) => ({ ...element, opacity: value }));
      return;
    }
    setOpacity(value);
  };

  return (
    <aside id="props-panel">
      <div className="prop-section" id="sec-stroke">
        <span className="prop-label">Stroke</span>
        <div id="color-swatches">
          {strokeSwatches.map((swatch) => (
            <button
              key={swatch}
              className={`color-swatch ${currentColor === swatch ? 'selected' : ''}`}
              type="button"
              style={{ background: swatch }}
              onClick={() => applyColor(swatch)}
            />
          ))}

          <input
            id="custom-color"
            className="color-input-swatch"
            type="color"
            value={currentColor}
            title="Custom color"
            aria-label="Custom stroke color"
            onChange={(event) => applyColor(event.target.value)}
          />
        </div>
      </div>

      {showFill ? (
        <div className="prop-section" id="sec-fill">
          <span className="prop-label">Background</span>
          <div id="fill-swatches">
            <button
              className={`color-swatch fill-none ${currentFill === 'none' ? 'selected' : ''}`}
              type="button"
              title="No background"
              onClick={() => applyFill('none')}
            >
              <span>X</span>
            </button>
            {fillSwatches.map((swatch) => (
              <button
                key={swatch}
                className={`color-swatch ${currentFill === swatch ? 'selected' : ''}`}
                type="button"
                style={{ background: swatch }}
                onClick={() => applyFill(swatch)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showFill && showAdvanced ? (
        <div className="prop-section" id="sec-fill-style">
          <span className="prop-label">Fill Style</span>
          <div className="switch-group">
            {fillStyles.map((style) => (
              <button
                key={style}
                className={`switch-btn ${currentFillStyle === style ? 'selected' : ''}`}
                type="button"
                onClick={() => applyFillStyle(style)}
              >
                {style === 'cross-hatch'
                  ? 'Cross'
                  : style === 'hachure'
                    ? 'Hachure'
                    : 'Solid'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showSize ? (
        <div className="prop-section" id="sec-size">
          <span className="prop-label">Stroke Width</span>
          <div className="switch-group">
            {strokeSizes.map((strokeSize, index) => (
              <button
                key={strokeSize}
                className={`switch-btn ${currentSize === strokeSize ? 'selected' : ''}`}
                type="button"
                onClick={() => applySize(strokeSize)}
              >
                {index === 0 ? 'Thin' : index === 1 ? 'Bold' : 'XL'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="prop-section" id="sec-stroke-style">
          <span className="prop-label">Stroke Style</span>
          <div className="switch-group">
            {strokeStyles.map((style) => (
              <button
                key={style}
                className={`switch-btn ${currentStrokeStyle === style ? 'selected' : ''}`}
                type="button"
                onClick={() => applyStrokeStyle(style)}
              >
                {style === 'solid' ? 'Solid' : style === 'dashed' ? 'Dashed' : 'Dotted'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="prop-section" id="sec-sloppiness">
          <span className="prop-label">Sloppiness</span>
          <div className="switch-group">
            {sloppinessLevels.map((level) => (
              <button
                key={level}
                className={`switch-btn ${currentSloppiness === level ? 'selected' : ''}`}
                type="button"
                onClick={() => applySloppiness(level)}
              >
                {level === 'architect'
                  ? 'Architect'
                  : level === 'artist'
                    ? 'Artist'
                    : 'Cartoon'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showArrowType ? (
        <div className="prop-section" id="sec-arrow-type">
          <span className="prop-label">Arrow Type</span>
          <div className="switch-group">
            {arrowTypes.map((value) => (
              <button
                key={value}
                className={`switch-btn ${currentArrowType === value ? 'selected' : ''}`}
                type="button"
                onClick={() => applyArrowType(value)}
              >
                {value === 'straight'
                  ? 'Straight'
                  : value === 'curve'
                    ? 'Curve'
                    : 'Elbow'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showEdges ? (
        <div className="prop-section" id="sec-edges">
          <span className="prop-label">Edges</span>
          <div className="switch-group">
            <button
              className={`switch-btn ${currentEdges === 'sharp' ? 'selected' : ''}`}
              type="button"
              title="Sharp"
              onClick={() => applyEdges('sharp')}
            >
              <Square size={18} />
            </button>
            <button
              className={`switch-btn ${currentEdges === 'round' ? 'selected' : ''}`}
              type="button"
              title="Round"
              onClick={() => applyEdges('round')}
            >
              <CornerDownRight size={18} />
            </button>
          </div>
        </div>
      ) : null}

      {showArrowheads ? (
        <div className="prop-section" id="sec-arrowheads">
          <span className="prop-label">Arrowheads</span>
          <div className="switch-group">
            {arrowheadStyles.map((style) => (
              <button
                key={style}
                className={`switch-btn ${currentEndArrowhead === style ? 'selected' : ''}`}
                type="button"
                onClick={() => applyEndArrowhead(style)}
              >
                {style === 'arrow'
                  ? '->'
                  : style === 'none'
                    ? '-'
                    : style === 'triangle'
                      ? '▶'
                      : '|'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showTextProps ? (
        <div className="prop-section" id="sec-font-family">
          <span className="prop-label">Font Family</span>
          <div className="switch-group">
            {fontFamilies.map((family) => (
              <button
                key={family}
                className={`switch-btn ${currentFontFamily === family ? 'selected' : ''}`}
                type="button"
                style={{ fontFamily: family }}
                onClick={() => applyFontFamily(family)}
              >
                {family === 'Caveat, cursive'
                  ? 'Hand'
                  : family === 'sans-serif'
                    ? 'Normal'
                    : 'Mono'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showTextProps ? (
        <div className="prop-section" id="sec-text-align">
          <span className="prop-label">Text Align</span>
          <div className="switch-group">
            {textAlignments.map((value) => (
              <button
                key={value}
                className={`switch-btn ${currentTextAlign === value ? 'selected' : ''}`}
                type="button"
                onClick={() => applyTextAlign(value)}
              >
                {value[0]!.toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showTextProps ? (
        <div className="prop-section" id="sec-font-size">
          <span className="prop-label">Font Size</span>
          <input
            id="font-size-slider"
            className="font-size-slider"
            type="range"
            min="12"
            max="120"
            value={currentFontSize}
            onChange={(event) => applyFontSize(Number(event.target.value))}
          />
        </div>
      ) : null}

      {showOpacity ? (
        <div className="prop-section" id="sec-opacity">
          <div className="prop-header-row">
            <span className="prop-label">Opacity</span>
            <span id="opacity-val">{Math.round(currentOpacity * 100)}%</span>
          </div>
          <input
            id="opacity-slider"
            className="opacity-slider"
            type="range"
            min="0"
            max="100"
            step="10"
            value={currentOpacity * 100}
            onChange={(event) => applyOpacity(Number(event.target.value) / 100)}
          />
        </div>
      ) : null}

      {inspectorMode ? (
        <div className="prop-section" id="sec-actions">
          <span className="prop-label">Actions</span>
          <div className="prop-actions">
            <button
              className="icon-btn action-btn"
              type="button"
              onClick={() => {
                duplicateSelection();
                showToast('Copied');
              }}
            >
              <Copy size={14} />
              Copy
            </button>
            <button
              className="icon-btn danger action-btn"
              type="button"
              onClick={deleteSelection}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
