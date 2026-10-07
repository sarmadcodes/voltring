import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { adUnit, adsReady, onAdsReady } from '@/services/ads';

type AdsModule = typeof import('react-native-google-mobile-ads');

/** Anchored adaptive banner. Renders nothing until consent allows ads, and collapses on failure. */
export function AdBanner() {
  const [ready, setReady] = useState(adsReady());
  const [failed, setFailed] = useState(false);
  useEffect(() => (ready ? undefined : onAdsReady(() => setReady(true))), [ready]);

  const unit = ready ? adUnit('banner') : null;
  if (!unit || failed) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads') as AdsModule;
  return (
    <View style={styles.wrap}>
      <BannerAd unitId={unit} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdFailedToLoad={() => setFailed(true)} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center' } });
