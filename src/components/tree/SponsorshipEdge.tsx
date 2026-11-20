'use client';

import React, { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import type { SponsorshipFlowEdge } from '../../lib/graph-layout';

export const SponsorshipEdge = memo(function SponsorshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps<SponsorshipFlowEdge>) {
  const isHighlighted = Boolean(data?.isHighlighted || selected);
  const isDimmed = Boolean(data?.isDimmed);
  const hasSelection = Boolean(data?.hasSelection);
  const isHorizontal = data?.direction === 'LR';
  const lineageSegment = data?.lineageSegment ?? 'NONE';

  const parallelOffset = data?.parallelOffset ?? 0;
  const sourceOffset = data?.sourceOffset ?? 0;
  const targetOffset = data?.targetOffset ?? 0;

  // Custom cubic Bezier curve with control-point spread so edges never share a horizontal bus bar
  let edgePath: string;
  if (isHorizontal) {
    const dx = Math.max(48, Math.abs(targetX - sourceX));
    const c1x = sourceX + dx * 0.42 + parallelOffset * 10;
    const c1y = sourceY + sourceOffset * 18 + parallelOffset * 18;
    const c2x = targetX - dx * 0.42 + parallelOffset * 10;
    const c2y = targetY + targetOffset * 18 + parallelOffset * 18;
    edgePath = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  } else {
    const dy = Math.max(48, Math.abs(targetY - sourceY));
    const c1x = sourceX + sourceOffset * 18 + parallelOffset * 18;
    const c1y = sourceY + dy * 0.42 + parallelOffset * 10;
    const c2x = targetX + targetOffset * 18 + parallelOffset * 18;
    const c2y = targetY - dy * 0.42 + parallelOffset * 10;
    edgePath = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  }

  let strokeColor = '#94a3b8';
  let strokeWidth = 1.35;
  let strokeOpacity = 0.24;

  if (hasSelection) {
    if (isHighlighted && !isDimmed) {
      // Upstream (Ancestors -> Student) in vibrant Emerald; Downstream (Student -> Descendants) in bright Sky Blue
      strokeColor = lineageSegment === 'UPSTREAM' ? '#10b981' : '#0ea5e9';
      strokeWidth = 2.85;
      strokeOpacity = 1;
    } else {
      strokeColor = '#94a3b8';
      strokeWidth = 1;
      strokeOpacity = 0.04;
    }
  }

  return (
    <g className="pointer-events-none">
      {isHighlighted && !isDimmed && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.18}
          strokeLinecap="round"
        />
      )}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeLinecap="round"
        markerEnd={isHighlighted && !isDimmed ? markerEnd : undefined}
        className="react-flow__edge-path pointer-events-none"
      />
    </g>
  );
});

export default SponsorshipEdge;
