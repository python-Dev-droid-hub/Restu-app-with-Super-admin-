import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors, useAppSpacing } from '../../../theme';

interface BannerHeaderProps {
  navigation?: any;
  onAddBanner: () => void;
  onBack?: () => void;
}

const BannerHeader = ({ navigation, onAddBanner, onBack }: BannerHeaderProps) => {
  const colors = useAppColors();
  const spacing = useAppSpacing();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) return onBack();
    return navigation?.goBack?.();
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingHorizontal: spacing.horizontal,
        paddingVertical: spacing.card,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border_light,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        onPress={handleBack}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.gray_100,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 24, color: colors.primary }}>←</Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: colors.text_dark,
          flex: 1,
          textAlign: 'center',
        }}
      >
        Banner Management
      </Text>

      <TouchableOpacity
        onPress={onAddBanner}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 28, color: colors.white, fontWeight: 'bold', marginTop: -2 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default BannerHeader;
