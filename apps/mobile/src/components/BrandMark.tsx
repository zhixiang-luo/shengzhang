import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 72 }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessible accessibilityLabel="声账小猪标记">
      <Circle cx="64" cy="64" r="59" fill={colors.blushSoft} />
      <G transform="translate(0 4)">
        <Path
          d="M24 55c-7 7-7 19 0 26"
          fill="none"
          opacity={0.65}
          stroke={colors.blushDeep}
          strokeLinecap="round"
          strokeWidth={3.2}
        />
        <Path
          d="M104 55c7 7 7 19 0 26"
          fill="none"
          opacity={0.65}
          stroke={colors.blushDeep}
          strokeLinecap="round"
          strokeWidth={3.2}
        />
        <Path
          d="M39 37c-7.4-8.2-8.6-17.8-1.8-21.2 6.4-3 12.3 3.2 15.7 12.9"
          fill={colors.blush}
          stroke={colors.ink}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.4}
        />
        <Path
          d="M89 37c7.4-8.2 8.6-17.8 1.8-21.2-6.4-3-12.3 3.2-15.7 12.9"
          fill={colors.blush}
          stroke={colors.ink}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.4}
        />
        <Path
          d="M28 66c0-23 14-37 36-37s36 14 36 37c0 22-14 35-36 35S28 88 28 66Z"
          fill={colors.surface}
          stroke={colors.ink}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.4}
        />
        <Ellipse cx={43.5} cy={75} rx={4.8} ry={3.2} fill={colors.blush} opacity={0.58} />
        <Ellipse cx={84.5} cy={75} rx={4.8} ry={3.2} fill={colors.blush} opacity={0.58} />
        <Circle cx={52} cy={62} r={3.8} fill={colors.ink} />
        <Circle cx={51} cy={60.8} r={1} fill={colors.surface} />
        <Circle cx={76} cy={62} r={3.8} fill={colors.ink} />
        <Circle cx={75} cy={60.8} r={1} fill={colors.surface} />
        <Rect x={49.5} y={73} width={29} height={18} rx={9} fill={colors.blush} stroke={colors.ink} strokeWidth={3} />
        <Circle cx={58.5} cy={82} r={2.4} fill={colors.ink} />
        <Circle cx={69.5} cy={82} r={2.4} fill={colors.ink} />
      </G>
    </Svg>
  );
}
