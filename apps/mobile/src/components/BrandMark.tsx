import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 72 }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessible accessibilityLabel="声账小猪标记">
      <Circle cx="64" cy="64" r="60" fill={colors.blushSoft} />
      <Path
        d="M29 66c0-25 14-40 35-40s35 15 35 40c0 23-14 36-35 36S29 89 29 66Z"
        fill={colors.surface}
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.5}
      />
      <Path
        d="M36 37c-7-9-6-18 1-21 7-2 12 3 15 12"
        fill={colors.blush}
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.5}
      />
      <Path
        d="M92 37c7-9 6-18-1-21-7-2-12 3-15 12"
        fill={colors.blush}
        stroke={colors.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.5}
      />
      <Circle cx={49} cy={61} r={3.3} fill={colors.ink} />
      <Circle cx={79} cy={61} r={3.3} fill={colors.ink} />
      <Rect x={46} y={73} width={36} height={22} rx={11} fill={colors.blush} stroke={colors.ink} strokeWidth={3} />
      <Circle cx={56} cy={84} r={2.4} fill={colors.ink} />
      <Circle cx={72} cy={84} r={2.4} fill={colors.ink} />
      <Path d="M104 54c5 0 8 4 8 9" fill="none" stroke={colors.blushDeep} strokeLinecap="round" strokeWidth={3} />
      <Path
        d="M106 43c9 0 14 7 14 16"
        fill="none"
        opacity={0.65}
        stroke={colors.blushDeep}
        strokeLinecap="round"
        strokeWidth={3}
      />
    </Svg>
  );
}
