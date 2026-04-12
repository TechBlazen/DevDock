/**
 * GridToggleIcon — 2×2 dot grid used to collapse / expand the sidebar.
 *
 * When `collapsed` is true the four dots spread apart slightly and rotate,
 * giving a visual cue that clicking will expand the panel.
 */
interface GridToggleIconProps {
  collapsed: boolean;
  size?: number;
}

export const GridToggleIcon = ({ collapsed, size = 18 }: GridToggleIconProps) => {
  const dotSize = 3.5;
  // Tighter grid when expanded, spread when collapsed
  const gap = collapsed ? 5.5 : 4;
  const offset = (size - gap - dotSize * 2) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: collapsed ? 'rotate(45deg)' : 'rotate(0deg)',
      }}
    >
      {/* Top-left */}
      <rect
        x={offset}
        y={offset}
        width={dotSize}
        height={dotSize}
        rx={1}
        fill="currentColor"
        style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Top-right */}
      <rect
        x={offset + dotSize + gap}
        y={offset}
        width={dotSize}
        height={dotSize}
        rx={1}
        fill="currentColor"
        style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Bottom-left */}
      <rect
        x={offset}
        y={offset + dotSize + gap}
        width={dotSize}
        height={dotSize}
        rx={1}
        fill="currentColor"
        style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Bottom-right */}
      <rect
        x={offset + dotSize + gap}
        y={offset + dotSize + gap}
        width={dotSize}
        height={dotSize}
        rx={1}
        fill="currentColor"
        style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
};
