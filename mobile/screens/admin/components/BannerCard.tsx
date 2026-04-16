import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { api } from '../../../components/api/client';

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionUrl?: string;
  actionText?: string;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

interface BannerCardProps {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (bannerId: string) => void;
  onToggleStatus: (bannerId: string, isActive: boolean) => void;
}

const BannerCard = ({ banner, onEdit, onDelete, onToggleStatus }: BannerCardProps) => {
  const getStatusColor = (isActive: boolean) => {
    return isActive ? colors.success : colors.gray_400;
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? '✓ Active' : '○ Inactive';
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = api.getBaseURL().replace(/\/?api\/?$/, '');
    if (!base) return url;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url.replace(/^\/+/, '')}`;
  };

  return (
    <View style={styles.container}>
      {/* Banner Image Preview */}
      <View style={styles.imageContainer}>
        {banner.imageUrl ? (
          <Image
            source={{ uri: getFullImageUrl(banner.imageUrl) }}
            style={styles.image}
          />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={40} color={colors.gray_400} />
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}

        {/* Status Badge - Top Right */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(banner.isActive) }]}>
          <Text style={styles.statusText}>
            {getStatusText(banner.isActive)}
          </Text>
        </View>
      </View>

      {/* Banner Info */}
      <View style={styles.infoContainer}>
        {/* Title + Order */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{banner.title}</Text>
          <Text style={styles.order}>#{banner.displayOrder}</Text>
        </View>

        {/* Description */}
        {banner.subtitle && (
          <Text style={styles.subtitle}>{banner.subtitle}</Text>
        )}

        {/* CTA */}
        {banner.actionText && (
          <View style={styles.ctaContainer}>
            <View style={styles.ctaBadge}>
              <Text style={styles.ctaText}>{banner.actionText}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {/* Toggle Active/Inactive */}
          <TouchableOpacity
            onPress={() => onToggleStatus(banner._id, !banner.isActive)}
            style={styles.toggleButton}
          >
            <Ionicons
              name={banner.isActive ? 'volume-mute' : 'volume-high'}
              size={20}
              color={colors.gray_600}
            />
          </TouchableOpacity>

          {/* Edit */}
          <TouchableOpacity onPress={() => onEdit(banner)} style={styles.editButton}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Delete Banner?',
                'This cannot be undone',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    onPress: () => onDelete(banner._id),
                    style: 'destructive',
                  },
                ]
              );
            }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.horizontal,
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.gray_100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImage: {
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 12,
    color: colors.gray_500,
    marginTop: 8,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  infoContainer: {
    padding: spacing.card,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text_dark,
    flex: 1,
  },
  order: {
    fontSize: 12,
    color: colors.gray_500,
    backgroundColor: colors.gray_100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray_600,
    marginBottom: 8,
    lineHeight: 18,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ctaBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BannerCard;
