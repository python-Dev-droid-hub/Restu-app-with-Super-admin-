import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

interface SuperAdminFooterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  { id: 'Dashboard', icon: 'grid', label: 'Dashboard' },
  { id: 'Branches', icon: 'business', label: 'Branches' },
  { id: 'Financial', icon: 'cash', label: 'Financial' },
  { id: 'Staff', icon: 'people', label: 'Staff' },
  { id: 'Orders', icon: 'cart', label: 'Orders' },
  { id: 'Profile', icon: 'person', label: 'Profile' },
];

export default function SuperAdminFooter({ activeTab, setActiveTab }: SuperAdminFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }] as any}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const iconName = isActive ? tab.icon : `${tab.icon}-outline`;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName as any}
              size={24}
              color={isActive ? COLORS.orange : COLORS.lightText}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    paddingTop: 8,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    fontWeight: FONTS.weights.regular,
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.orange,
    fontWeight: FONTS.weights.medium,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    backgroundColor: COLORS.orange,
    borderRadius: 2,
  },
});
