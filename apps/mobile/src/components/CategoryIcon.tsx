import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  normalizeCategoryIcon,
  type CategoryIconName,
} from '../features/categories/categoryIcons';
import { colors } from '../theme/tokens';

type CategoryIconProps = {
  icon: string | null | undefined;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function CategoryIcon({
  icon,
  size = 21,
  color = colors.ink,
  strokeWidth = 1.7,
}: CategoryIconProps) {
  const name = normalizeCategoryIcon(icon);
  const common = {
    fill: 'none',
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {renderCategoryIcon(name, common)}
    </Svg>
  );
}

function renderCategoryIcon(
  name: CategoryIconName,
  common: {
    fill: string;
    stroke: string;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
    strokeWidth: number;
  },
) {
  switch (name) {
    case 'food':
    case 'tripFood':
      return (
        <>
          <Path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11" {...common} />
          <Path d="M16 3c2.2 2 3 4.2 3 7h-5c0-2.8.8-5 2-7ZM16.5 10v11" {...common} />
        </>
      );
    case 'breakfast':
      return (
        <>
          <Path d="M4.5 12h15c-.7 4.1-3.3 6.2-7.5 6.2S5.2 16.1 4.5 12Z" {...common} />
          <Path d="M8 3.5c-1.5 1.5 1.5 2.2 0 3.7M12 2.8c-1.6 1.7 1.6 2.4 0 4.1M16 3.5c-1.5 1.5 1.5 2.2 0 3.7M8.5 21h7" {...common} />
        </>
      );
    case 'lunch':
      return (
        <>
          <Rect x="4.5" y="6.5" width="15" height="12" rx="3" {...common} />
          <Path d="M12 7v11M5 12h14M9 9.5h.1M15 9.5h.1" {...common} />
        </>
      );
    case 'dinner':
    case 'dining':
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...common} />
          <Circle cx="12" cy="12" r="3.2" {...common} />
          {name === 'dining' ? <Path d="M3 19c1.5-1.2 3-1.2 4.5 0M16.5 19c1.5-1.2 3-1.2 4.5 0" {...common} /> : null}
        </>
      );
    case 'coffee':
    case 'treat':
      return (
        <>
          <Path d="M5 7h11v7.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5V7Z" {...common} />
          <Path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-1 1.2 1 1.8 0 3M12 3.5c-1 1.2 1 1.8 0 3M4 21h13" {...common} />
        </>
      );
    case 'takeout':
      return (
        <>
          <Path d="M6 8.5h12l-1 11H7l-1-11Z" {...common} />
          <Path d="M9 9V6.5a3 3 0 0 1 6 0V9M9.5 13h5" {...common} />
        </>
      );
    case 'snack':
      return (
        <>
          <Path d="M12 8c-4.5-2.2-7.4 1.2-6.8 5.2.7 4 3.2 7.2 6.8 4.5 3.6 2.7 6.1-.5 6.8-4.5C19.4 9.2 16.5 5.8 12 8Z" {...common} />
          <Path d="M12 8c.2-2.2 1.3-3.8 3.5-4.5M15 4.2c1.5-.3 2.6.1 3.3 1.2-1.4.7-2.6.5-3.3-1.2Z" {...common} />
        </>
      );
    case 'transport':
    case 'taxi':
      return (
        <>
          <Path d="m5 11 1.8-4h10.4l1.8 4M4 11h16v6H4v-6Z" {...common} />
          <Path d="M7 17v2M17 17v2M7.5 14h.1M16.5 14h.1" {...common} />
          {name === 'taxi' ? <Path d="M9 7V4h6v3M8 4h8" {...common} /> : null}
        </>
      );
    case 'transit':
    case 'train':
      return (
        <>
          <Rect x="5.5" y="3.5" width="13" height="15" rx="4" {...common} />
          <Path d="M8 7h8M8.5 12h.1M15.5 12h.1M8 18.5 6 21M16 18.5 18 21" {...common} />
          {name === 'transit' ? <Path d="M8 15h8" {...common} /> : null}
        </>
      );
    case 'fuel':
      return (
        <>
          <Path d="M5 21V5c0-1.1.9-2 2-2h5c1.1 0 2 .9 2 2v16M4 21h11M6 8h7" {...common} />
          <Path d="m14 8 3 2v7.5a2 2 0 0 0 4 0V10l-3-3" {...common} />
        </>
      );
    case 'parking':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M9.5 17V7h3.2a3 3 0 0 1 0 6H9.5" {...common} />
        </>
      );
    case 'bike':
      return (
        <>
          <Circle cx="6" cy="17" r="3" {...common} />
          <Circle cx="18" cy="17" r="3" {...common} />
          <Path d="m6 17 4-7h4l3 7M9 10h5M13 7h2" {...common} />
        </>
      );
    case 'shopping':
      return (
        <>
          <Path d="M5 8h14l-1 13H6L5 8Z" {...common} />
          <Path d="M9 8V6a3 3 0 0 1 6 0v2" {...common} />
        </>
      );
    case 'clothing':
      return (
        <Path d="M8 4 4 7l2.2 3 2-1.2V20h7.6V8.8l2 1.2L20 7l-4-3c-.8 1.4-2.2 2.2-4 2.2S8.8 5.4 8 4Z" {...common} />
      );
    case 'daily':
      return (
        <>
          <Path d="m4 8 8-4 8 4-8 4-8-4ZM4 8v9l8 4 8-4V8M12 12v9" {...common} />
        </>
      );
    case 'digital':
      return (
        <>
          <Rect x="5" y="4" width="14" height="11" rx="2.5" {...common} />
          <Path d="M3 19h18M9 15l-.6 2M15 15l.6 2" {...common} />
        </>
      );
    case 'beauty':
      return (
        <>
          <Path d="m9 4 5 5-5.5 9.5a2.8 2.8 0 0 1-4.8-2.9L9 4Z" {...common} />
          <Path d="m9 4 5 5M4.5 13.5l5.2 2.7M16 12h1M18.5 8.5h1M17 15.5h1" {...common} />
        </>
      );
    case 'household':
      return (
        <>
          <Path d="M4 13.5h16V18H4v-4.5ZM6 18v2M18 18v2M7 13.5V10h10v3.5M9 9l1-3h4l1 3" {...common} />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="m3.5 11 8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" {...common} />
        </>
      );
    case 'rent':
      return (
        <>
          <Circle cx="8" cy="9" r="4" {...common} />
          <Path d="m11 12 9 9M15 16l2-2M18 19l2-2" {...common} />
        </>
      );
    case 'utilities':
      return <Path d="m13.5 2-7 11h5L10.5 22l7-12h-5l1-8Z" {...common} />;
    case 'property':
      return (
        <>
          <Path d="M4 21V5l7-2v18M11 8h9v13M7 7h.1M7 11h.1M7 15h.1M15 11h.1M15 15h.1M15 19h.1" {...common} />
        </>
      );
    case 'repair':
      return (
        <Path d="M14.5 6.5a5 5 0 0 0-6.3-4l2.7 2.7-2.8 2.8L5.4 5.3a5 5 0 0 0 6.4 6.4l7.3 7.3a2 2 0 0 0 2.8-2.8l-7.4-7.3Z" {...common} />
      );
    case 'entertainment':
    case 'ticket':
      return (
        <Path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z M12 6v2M12 16v2" {...common} />
      );
    case 'movie':
      return (
        <>
          <Path d="M4 8h16v12H4V8ZM4 8l2-4h4l-2 4M10 8l2-4h4l-2 4M16 8l2-4h2" {...common} />
        </>
      );
    case 'game':
      return (
        <>
          <Path d="M8 10h8c2.5 0 4 2 3.5 5.5l-.4 2.2a2 2 0 0 1-3.3 1.1L14 17h-4l-1.8 1.8a2 2 0 0 1-3.3-1.1l-.4-2.2C4 12 5.5 10 8 10Z" {...common} />
          <Path d="M8 13v4M6 15h4M16.5 14h.1M18 16h.1" {...common} />
        </>
      );
    case 'subscription':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="m10 8 6 4-6 4V8Z" {...common} />
        </>
      );
    case 'recreation':
      return (
        <>
          <Path d="M4 13a8 8 0 0 1 16 0H4ZM12 13v7M8 21h8" {...common} />
          <Path d="M7 13c1.5-2.5 2.8-3.8 4-4M17 13c-1.5-2.5-2.8-3.8-4-4" {...common} />
        </>
      );
    case 'entertainmentOther':
      return (
        <>
          <Path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3ZM18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" {...common} />
        </>
      );
    case 'health':
      return <Path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" {...common} />;
    case 'clinic':
      return (
        <>
          <Rect x="3.5" y="7" width="17" height="13" rx="3" {...common} />
          <Path d="M8 7V4h8v3M12 10v7M8.5 13.5h7" {...common} />
        </>
      );
    case 'medicine':
      return (
        <>
          <Path d="M5.2 18.8a4.5 4.5 0 0 1 0-6.4l7.2-7.2a4.5 4.5 0 0 1 6.4 6.4l-7.2 7.2a4.5 4.5 0 0 1-6.4 0Z" {...common} />
          <Path d="m8.5 8.5 7 7" {...common} />
        </>
      );
    case 'checkup':
      return (
        <>
          <Path d="M12 20S4 15.5 4 9.5A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.5C20 15.5 12 20 12 20Z" {...common} />
          <Path d="M6 12h3l1.2-2.5 2 5 1.4-3H18" {...common} />
        </>
      );
    case 'insurance':
      return (
        <>
          <Path d="M12 2.5 20 6v5.5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6l8-3.5Z" {...common} />
          <Path d="m8.5 12 2.3 2.3 4.8-5" {...common} />
        </>
      );
    case 'education':
      return (
        <>
          <Path d="m3 9 9-4 9 4-9 4-9-4ZM6 11v5.5c3.7 2.3 8.3 2.3 12 0V11M21 9v6" {...common} />
        </>
      );
    case 'book':
      return (
        <>
          <Path d="M3.5 5.5A10 10 0 0 1 12 7v14a10 10 0 0 0-8.5-1.5v-14ZM20.5 5.5A10 10 0 0 0 12 7v14a10 10 0 0 1 8.5-1.5v-14Z" {...common} />
        </>
      );
    case 'course':
      return (
        <>
          <Rect x="3.5" y="4" width="17" height="12" rx="2" {...common} />
          <Path d="M12 16v3M8 21h8M8 8h8M8 11h5" {...common} />
        </>
      );
    case 'exam':
      return (
        <>
          <Path d="M5 3h10l4 4v14H5V3Z M15 3v4h4M8 11h8M8 15h5M8 18h3" {...common} />
        </>
      );
    case 'stationery':
      return (
        <>
          <Path d="m5 19 1-5 9.5-9.5a2.1 2.1 0 0 1 3 3L9 17l-4 2Z" {...common} />
          <Path d="m14.5 5.5 4 4M6 14l4 4" {...common} />
        </>
      );
    case 'gift':
    case 'present':
      return (
        <>
          <Path d="M4 10h16v11H4V10ZM3 6h18v4H3V6ZM12 6v15" {...common} />
          <Path d="M12 6H8.5a2.5 2.5 0 1 1 2.2-3.7L12 6Zm0 0h3.5a2.5 2.5 0 1 0-2.2-3.7L12 6Z" {...common} />
        </>
      );
    case 'redpacket':
      return (
        <>
          <Rect x="5" y="3.5" width="14" height="17" rx="3" {...common} />
          <Path d="M7 5.5c3.3 2.6 6.7 2.6 10 0M9 11h6M9 14h6" {...common} />
        </>
      );
    case 'family':
      return (
        <>
          <Circle cx="8" cy="8" r="3" {...common} />
          <Circle cx="16.5" cy="9" r="2.3" {...common} />
          <Path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13c2.7 0 4.5 2 4.5 4.5V20M14 14.5c2.8-.7 6 .6 6 3.2V20" {...common} />
        </>
      );
    case 'communication':
      return (
        <>
          <Path d="M8.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 1 0 13M15.5 8.5a5 5 0 0 0 0 7M18.5 5.5a9 9 0 0 0 0 13" {...common} />
          <Circle cx="12" cy="12" r="1.5" fill={common.stroke} stroke="none" />
        </>
      );
    case 'phone':
      return (
        <>
          <Rect x="7" y="2.5" width="10" height="19" rx="3" {...common} />
          <Path d="M10 5h4M11 18.5h2" {...common} />
        </>
      );
    case 'internet':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" {...common} />
        </>
      );
    case 'cloud':
      return (
        <>
          <Path d="M7 19h10a4 4 0 0 0 .7-7.9A6.5 6.5 0 0 0 5.4 10 4.5 4.5 0 0 0 7 19Z" {...common} />
          <Path d="M9 14h6" {...common} />
        </>
      );
    case 'pet':
      return (
        <>
          <Circle cx="7" cy="8" r="2" {...common} />
          <Circle cx="12" cy="5.5" r="2" {...common} />
          <Circle cx="17" cy="8" r="2" {...common} />
          <Path d="M7.5 15.5c0-3 2-5 4.5-5s4.5 2 4.5 5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5Z" {...common} />
        </>
      );
    case 'petfood':
      return (
        <>
          <Path d="M4.5 12h15c-.7 4.1-3.3 6.2-7.5 6.2S5.2 16.1 4.5 12Z" {...common} />
          <Path d="M8 8.5c.8-1.7 2-2.5 4-2.5s3.2.8 4 2.5M8 21h8" {...common} />
        </>
      );
    case 'petmedical':
      return (
        <>
          <Circle cx="12" cy="10" r="5" {...common} />
          <Path d="M12 7v6M9 10h6M6 21c1-3 3-4.5 6-4.5S17 18 18 21" {...common} />
        </>
      );
    case 'petsupply':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M5 9.5c2.5 1.3 4.5 1.3 7 0s4.5-1.3 7 0M12 12l2 4H10l2-4Z" {...common} />
        </>
      );
    case 'petservice':
      return (
        <>
          <Circle cx="7" cy="7" r="3" {...common} />
          <Circle cx="7" cy="17" r="3" {...common} />
          <Path d="m9.3 9.2 10.2 8M9.3 14.8 19.5 6.8" {...common} />
        </>
      );
    case 'sports':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 3c2.2 3 3.2 6 3.2 9s-1 6-3.2 9M3 12h18M5 6.5c2.5 1.8 4.8 2.7 7 2.7s4.5-.9 7-2.7M5 17.5c2.5-1.8 4.8-2.7 7-2.7s4.5.9 7 2.7" {...common} />
        </>
      );
    case 'venue':
      return (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="4" {...common} />
          <Path d="M7 5v3M17 5v3M7 16v3M17 16v3M12 8v8M8.5 12h7" {...common} />
        </>
      );
    case 'equipment':
      return (
        <>
          <Path d="M7 8v8M4 10v4M17 8v8M20 10v4M7 12h10" {...common} />
          <Rect x="2" y="9" width="3" height="6" rx="1" {...common} />
          <Rect x="19" y="9" width="3" height="6" rx="1" {...common} />
        </>
      );
    case 'fitness':
      return (
        <>
          <Path d="M12 21S3.5 16.4 3.5 10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 20.5 10c0 6.4-8.5 11-8.5 11Z" {...common} />
          <Path d="M5 12h3l1.2-2.4 2.1 4.8 1.4-2.4H19" {...common} />
        </>
      );
    case 'travel':
      return (
        <>
          <Rect x="3.5" y="7" width="17" height="13" rx="3" {...common} />
          <Path d="M8 7V4h8v3M9 7v13M15 7v13M7 11h.1M17 11h.1" {...common} />
        </>
      );
    case 'hotel':
      return (
        <>
          <Path d="M3 19V8M3 15h18v4M3 12h8a4 4 0 0 1 4 4v-2a4 4 0 0 1 4-4h2M18 12a2 2 0 1 0 0 .1" {...common} />
        </>
      );
    case 'tripTransport':
      return (
        <>
          <Path d="m3 12 18-7-5 15-4-6-6 3 1-5H3Z" {...common} />
          <Path d="m9 15 3 3" {...common} />
        </>
      );
    case 'salary':
      return (
        <>
          <Rect x="3" y="6" width="18" height="12" rx="3" {...common} />
          <Circle cx="12" cy="12" r="2.5" {...common} />
          <Path d="M6 9h.1M18 15h.1" {...common} />
        </>
      );
    case 'bonus':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="m12 6 1.7 3.5 3.8.6-2.7 2.7.6 3.8L12 14.8l-3.4 1.8.6-3.8-2.7-2.7 3.8-.6L12 6Z" {...common} />
        </>
      );
    case 'side':
      return (
        <>
          <Rect x="3" y="7" width="18" height="13" rx="3" {...common} />
          <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" {...common} />
        </>
      );
    case 'invest':
      return (
        <>
          <Path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6M16 7h3v3" {...common} />
        </>
      );
    case 'refund':
      return (
        <>
          <Path d="M4 8h10a5 5 0 0 1 0 10H8M8 4 4 8l4 4" {...common} />
          <Path d="M12 10v5M10 12.5h4" {...common} />
        </>
      );
    case 'reimburse':
      return (
        <>
          <Path d="M5 3.5h14v18l-3-2-4 2-4-2-3 2v-18Z" {...common} />
          <Path d="m8.5 11 2.2 2.2 4.8-5M9 6h6" {...common} />
        </>
      );
    case 'other':
      return (
        <>
          <Circle cx="7" cy="7" r="1.7" {...common} />
          <Circle cx="17" cy="7" r="1.7" {...common} />
          <Circle cx="7" cy="17" r="1.7" {...common} />
          <Circle cx="17" cy="17" r="1.7" {...common} />
        </>
      );
    default:
      return (
        <>
          <Circle cx="7" cy="7" r="1.7" {...common} />
          <Circle cx="17" cy="7" r="1.7" {...common} />
          <Circle cx="7" cy="17" r="1.7" {...common} />
          <Circle cx="17" cy="17" r="1.7" {...common} />
        </>
      );
  }
}
