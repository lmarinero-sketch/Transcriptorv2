
import { useState, useRef, useCallback, useEffect } from "react";

interface Branch {
  topic: string;
  color: string;
  items: string[];
}

interface ConceptMapData {
  central: string;
  branches: Branch[];
}

export default function ConceptMap({ data }: { data: ConceptMapData }) {
  if (!data || !data.branches) return null;

  const branches = data.branches.slice(0, 6);
  const total = branches.length;

  // Pan & Zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.55);
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // Reset view
  const resetView = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    setScale(0.55);
  }, []);

  // Mouse handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    setIsPanning(true);
    setPanStart({ x: e.clientX - translateRef.current.x, y: e.clientY - translateRef.current.y });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel handler for zoom — use native listener to avoid passive event error
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.3), 3));
  }, []);

  // Attach wheel listener as non-passive via useEffect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - translateRef.current.x,
        y: e.touches[0].clientY - translateRef.current.y,
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    setTranslate({
      x: e.touches[0].clientX - panStart.x,
      y: e.touches[0].clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Expanded SVG canvas — generous space to avoid overlap
  const svgWidth = 1800;
  const svgHeight = 1400;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 520;
    const radiusY = 420;
    return {
      x: cx + radiusX * Math.cos(angle),
      y: cy + radiusY * Math.sin(angle),
    };
  };

  // Wrap text into multi-lines
  const wrapText = (text: string, maxLen: number): string[] => {
    if (text.length <= maxLen) return [text];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length <= maxLen) {
        current = (current + " " + word).trim();
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        display: "flex",
        gap: 6,
      }}>
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.3))}
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
          title="Zoom out"
        >−</button>
        <button
          onClick={resetView}
          style={{
            height: 32,
            padding: "0 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.6)",
            color: "#9CA3AF",
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
            fontFamily: "Inter, sans-serif",
          }}
          title="Reset view"
        >Reset</button>
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 10,
        fontSize: 11,
        color: "rgba(255,255,255,0.3)",
        fontFamily: "Inter, sans-serif",
        pointerEvents: "none",
      }}>
        🖱️ Arrastra para mover • Scroll para zoom
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100%",
          height: 550,
          overflow: "hidden",
          cursor: isPanning ? "grabbing" : "grab",
          borderRadius: 12,
          background: "radial-gradient(ellipse at center, rgba(0,255,136,0.03) 0%, #000000 70%)",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: svgWidth,
            height: svgHeight,
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.15s ease-out",
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -svgHeight / 2,
            marginLeft: -svgWidth / 2,
          }}
        >
          <defs>
            {branches.map((branch, i) => (
              <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            <filter id="glow-center" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Connection lines from center to branches */}
          {branches.map((branch, i) => {
            const pos = getPosition(i, total);
            return (
              <line
                key={`line-${i}`}
                x1={cx}
                y1={cy}
                x2={pos.x}
                y2={pos.y}
                stroke={branch.color}
                strokeWidth={2}
                strokeOpacity={0.3}
                strokeDasharray="8 6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="28"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </line>
            );
          })}

          {/* Central node */}
          <circle
            cx={cx}
            cy={cy}
            r={70}
            fill="rgba(0, 255, 136, 0.08)"
            stroke="#00FF88"
            strokeWidth={2.5}
            filter="url(#glow-center)"
          />
          <circle
            cx={cx}
            cy={cy}
            r={70}
            fill="none"
            stroke="rgba(0, 255, 136, 0.15)"
            strokeWidth={1}
          />
          {(() => {
            const lines = wrapText(data.central, 14);
            const lineHeight = 18;
            const startY = cy - ((lines.length - 1) * lineHeight) / 2;
            return lines.map((line, li) => (
              <text
                key={`center-${li}`}
                x={cx}
                y={startY + li * lineHeight}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontWeight={800}
                fontSize={14}
                fontFamily="Inter, sans-serif"
              >
                {line}
              </text>
            ));
          })()}

          {/* Branch nodes */}
          {branches.map((branch, i) => {
            const pos = getPosition(i, total);
            const topicLines = wrapText(branch.topic, 20);
            const bubbleHeight = Math.max(40, topicLines.length * 18 + 16);
            const bubbleWidth = 180;

            // Sub-items radiate outward from the branch
            const itemAngle = Math.atan2(pos.y - cy, pos.x - cx);

            return (
              <g key={`branch-${i}`}>
                {/* Branch bubble background */}
                <rect
                  x={pos.x - bubbleWidth / 2}
                  y={pos.y - bubbleHeight / 2}
                  width={bubbleWidth}
                  height={bubbleHeight}
                  rx={bubbleHeight / 2}
                  fill="#0a0a0a"
                  stroke={branch.color}
                  strokeWidth={1.5}
                  filter={`url(#glow-${i})`}
                />
                <rect
                  x={pos.x - bubbleWidth / 2}
                  y={pos.y - bubbleHeight / 2}
                  width={bubbleWidth}
                  height={bubbleHeight}
                  rx={bubbleHeight / 2}
                  fill={`${branch.color}15`}
                  stroke="none"
                />

                {/* Branch topic text */}
                {topicLines.map((line, li) => {
                  const lineHeight = 18;
                  const startY = pos.y - ((topicLines.length - 1) * lineHeight) / 2;
                  return (
                    <text
                      key={`topic-${i}-${li}`}
                      x={pos.x}
                      y={startY + li * lineHeight}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={branch.color}
                      fontWeight={700}
                      fontSize={13}
                      fontFamily="Inter, sans-serif"
                    >
                      {line}
                    </text>
                  );
                })}

                {/* Sub-items */}
                {branch.items.slice(0, 4).map((item, j) => {
                  const subRadius = 160;
                  const spreadAngle = 0.55;
                  const subAngle =
                    itemAngle +
                    (j - (Math.min(branch.items.length, 4) - 1) / 2) * spreadAngle;
                  const sx = pos.x + subRadius * Math.cos(subAngle);
                  const sy = pos.y + subRadius * Math.sin(subAngle);

                  const itemLines = wrapText(item, 18);
                  const itemBubbleH = Math.max(28, itemLines.length * 14 + 12);
                  const itemBubbleW = 140;

                  return (
                    <g key={`item-${i}-${j}`}>
                      {/* Connection line to sub-item */}
                      <line
                        x1={pos.x}
                        y1={pos.y}
                        x2={sx}
                        y2={sy}
                        stroke={branch.color}
                        strokeWidth={1}
                        strokeOpacity={0.2}
                      />

                      {/* Sub-item background */}
                      <rect
                        x={sx - itemBubbleW / 2}
                        y={sy - itemBubbleH / 2}
                        width={itemBubbleW}
                        height={itemBubbleH}
                        rx={itemBubbleH / 2}
                        fill="#0a0a0a"
                        stroke={`${branch.color}55`}
                        strokeWidth={0.8}
                      />

                      {/* Sub-item text */}
                      {itemLines.map((line, li) => {
                        const lh = 14;
                        const startY = sy - ((itemLines.length - 1) * lh) / 2;
                        return (
                          <text
                            key={`itemtext-${i}-${j}-${li}`}
                            x={sx}
                            y={startY + li * lh}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#d1d5db"
                            fontSize={10}
                            fontFamily="Inter, sans-serif"
                          >
                            {line}
                          </text>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
