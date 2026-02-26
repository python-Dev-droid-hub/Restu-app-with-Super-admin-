import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

interface SafeAreaScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: SafeAreaEdge[];
  extraTop?: number;
  extraBottom?: number;
  extraLeft?: number;
  extraRight?: number;
}

export default function SafeAreaScreen({
  children,
  style,
  edges = ['top', 'bottom'],
  extraTop = 0,
  extraBottom = 0,
  extraLeft = 0,
  extraRight = 0,
}: SafeAreaScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = (edges.includes('top') ? insets.top : 0) + extraTop;
  const paddingBottom = (edges.includes('bottom') ? insets.bottom : 0) + extraBottom;
  const paddingLeft = (edges.includes('left') ? insets.left : 0) + extraLeft;
  const paddingRight = (edges.includes('right') ? insets.right : 0) + extraRight;

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
