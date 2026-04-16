import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useAppColors, useAppSpacing } from '../../../theme';
import Toast from 'react-native-toast-message';
import { api } from '../../../components/api/client';

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  discount?: string;
  actionText?: string;
  actionUrl?: string;
}

type UiBanner = {
  _id: string;
  title: string;
  description?: string;
  image: string;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
  discount?: string;
  cta?: string;
  actionUrl?: string;
};

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (!base) return url;
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url.replace(/^\/+/, '')}`;
};

const DEFAULT_BANNER: UiBanner = {
  _id: 'default',
  title: 'Welcome to Kababjees',
  description: 'Delicious food delivered to your door',
  image: 'https://via.placeholder.com/400x200?text=Welcome',
  order: 1,
  status: 'ACTIVE',
  discount: '',
  cta: 'ORDER NOW',
};

const HeroBanner = ({ navigation }: any) => {
  const colors = useAppColors();
  const spacing = useAppSpacing();
  const screenWidth = Dimensions.get('window').width;

  const [banners, setBanners] = useState<UiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const flatListRef = useRef<FlatList<UiBanner>>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalize = (input: Banner): UiBanner => {
    return {
      _id: input._id,
      title: input.title,
      description: input.subtitle,
      image: getFullImageUrl(input.imageUrl),
      order: input.displayOrder ?? 0,
      status: input.isActive ? 'ACTIVE' : 'INACTIVE',
      discount: input.discount,
      cta: input.actionText,
      actionUrl: input.actionUrl,
    };
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ banners: Banner[] }>('/banners/active');

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch banners');
      }

      const rawBanners = response.data?.banners || [];
      const validBanners = rawBanners
        .filter((b) => b?._id && b?.imageUrl && b.isActive)
        .map(normalize)
        .sort((a, b) => a.order - b.order);

      if (validBanners.length === 0) {
        setBanners([DEFAULT_BANNER]);
      } else {
        setBanners(validBanners);
      }

      console.log('[HeroBanner] Loaded', validBanners.length, 'banners');
    } catch (err) {
      console.error('[HeroBanner Error]', err);
      const message = err instanceof Error ? err.message : 'Failed to load banners';
      setError(message);
      setBanners([DEFAULT_BANNER]);

      try {
        Toast.show({
          type: 'error',
          text1: 'Failed to load banners',
          text2: 'Showing default banner',
        });
      } catch {
        // toast might not be mounted on some screens
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (banners.length > 1) {
      startAutoScroll();
    }

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    autoScrollTimer.current = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 5000);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / screenWidth);
    setActiveBannerIndex(currentIndex);
  };

  const handlePaginationPress = (index: number) => {
    setActiveBannerIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleBannerPress = (banner: UiBanner) => {
    console.log('[HeroBanner] Tapped banner:', banner.title);

    if (banner.actionUrl) {
      // leave placeholder: app-specific deep linking logic can be added later
      return;
    }

    try {
      navigation?.navigate?.('Search');
    } catch {
      // navigation not available
    }
  };

  const containerStyle = useMemo(
    () => ({
      width: screenWidth,
      height: 200,
      backgroundColor: colors.gray_100,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.section,
    }),
    [colors.gray_100, spacing.section, screenWidth]
  );

  if (loading) {
    return (
      <View style={containerStyle}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && banners.length === 0) {
    return (
      <View style={containerStyle}>
        <Text style={{ color: colors.gray_600, fontSize: 12 }}>⚠️ Failed to load banners</Text>
        <TouchableOpacity
          onPress={fetchBanners}
          style={{
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colors.primary,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 12, fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.section }}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleBannerPress(item)} activeOpacity={0.9}>
            <View
              style={{
                width: screenWidth - 32,
                height: 200,
                marginHorizontal: 16,
                borderRadius: spacing.borderRadius.lg,
                overflow: 'hidden',
                backgroundColor: colors.gray_100,
              }}
            >
              <ImageBackground
                source={{ uri: item.image }}
                style={{ width: '100%', height: '100%' }}
                imageStyle={{ resizeMode: 'cover' }}
              />
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item._id}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={banners.length > 1}
      />

      {banners.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
          }}
        >
          {banners.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handlePaginationPress(index)}
              style={{
                width: activeBannerIndex === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeBannerIndex === index ? colors.primary : colors.gray_300,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default HeroBanner;
