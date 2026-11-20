'use client';

import React, { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
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
    borderRadius: 18,
  });

  const strokeColor = isHighlighted ? '#38bdf8' : '#0ea5e9';
  const strokeWidth = isHighlighted ? 2.6 : 1.9;
  const strokeOpacity = isDimmed ? 0.14 : isHighlighted ? 1 : 0.72;

  return (
    <>
      {isHighlighted && !isDimmed && (
        <path
          d={edgePath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.22}
          strokeLinecap="round"
          className="pointer-events-none"
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeOpacity,
          transition:
            'stroke 200ms ease, stroke-opacity 200ms ease, stroke-width 200ms ease',
        }}
      />
    </>
  );
});

export default SponsorshipEdge;
