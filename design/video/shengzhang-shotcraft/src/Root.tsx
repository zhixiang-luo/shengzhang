import React from 'react';
import { Composition } from 'remotion';
import { ShengzhangMain, TOTAL_FRAMES } from './Main';

export const Root: React.FC = () => (
  <Composition
    id="ShengzhangPromo"
    component={ShengzhangMain}
    defaultProps={{ bgm: true }}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
