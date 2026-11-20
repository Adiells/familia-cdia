'use client';

import React, { memo } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { SponsorshipFlowEdge } from '../../lib/graph-layout';

export const SponsorshipEdge = memo(function SponsorshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<SponsorshipFlowEdge>) {
  const isHighlighted = Boolean(data?.isHighlighted || selected);
  const isDimmed = Boolean(data?.isDimmed);

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const strokeColor = isHighlighted ? '#0284c7' : '#38bdf8';
  const strokeWidth = isHighlighted ? 2.5 : 1.75;
  const strokeOpacity = isDimmed ? 0.16 : isHighlighted ? 1 : 0.65;

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      markerEnd={markerEnd}
      className="react-flow__edge-path pointer-events-none"
    />
  );
});

export default SponsorshipEdge;
