import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

export type IconName =
  | 'back'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'clock'
  | 'drag'
  | 'ledger'
  | 'mic'
  | 'plus'
  | 'settings'
  | 'trash';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'close' && <Path d="m6 6 12 12M18 6 6 18" {...common} />}
      {name === 'back' && <Path d="m15 5-7 7 7 7" {...common} />}
      {name === 'chevron-left' && <Path d="m14.5 6-6 6 6 6" {...common} />}
      {name === 'chevron-right' && <Path d="m9.5 6 6 6-6 6" {...common} />}
      {name === 'mic' && (
        <>
          <Rect x="8.5" y="3.5" width="7" height="11" rx="3.5" {...common} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" {...common} />
        </>
      )}
      {name === 'ledger' && (
        <>
          <Rect x="4.5" y="3.5" width="15" height="17" rx="3" {...common} />
          <Path d="M8 8h8M8 12h8M8 16h5" {...common} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...common} />
        </>
      )}
      {name === 'drag' && <Path d="M8 9h8M8 15h8" {...common} strokeWidth={2.4} />}
      {name === 'calendar' && (
        <>
          <Rect x="3.5" y="5" width="17" height="15.5" rx="3" {...common} />
          <Path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" {...common} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 7.5V12l3.2 2" {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path d="M19 13.5v-3l-2-.6-.7-1.7 1.1-1.8-2.1-2.1-1.8 1.1-1.7-.7-.6-2h-3l-.6 2-1.7.7-1.8-1.1-2.1 2.1 1.1 1.8-.7 1.7-2 .6v3l2 .6.7 1.7-1.1 1.8 2.1 2.1 1.8-1.1 1.7.7.6 2h3l.6-2 1.7-.7 1.8 1.1 2.1-2.1-1.1-1.8.7-1.7 2-.6Z" {...common} />
        </>
      )}
      {name === 'check' && <Path d="m5 12 4.5 4.5L19 7" {...common} />}
      {name === 'trash' && (
        <>
          <Path d="M4 7h16M9 7V4.5h6V7M7 7l1 13h8l1-13M10 11v5M14 11v5" {...common} />
        </>
      )}
    </Svg>
  );
}
