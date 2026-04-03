import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../../theme';
import api from '../../../services/api';

interface OrderReviewModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  onReviewSubmitted: () => void;
}

export default function OrderReviewModal({
  visible,
  onClose,
  orderId,
  orderNumber,
  onReviewSubmitted,
}: OrderReviewModalProps) {
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [foodComment, setFoodComment] = useState('');
  const [deliveryComment, setDeliveryComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (foodRating === 0 || deliveryRating === 0) {
      setError('Please rate both food and delivery');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await api.put(`/orders/${orderId}/review`, {
        foodRating,
        deliveryRating,
      });

      if (response?.data?.success) {
        onReviewSubmitted();
        onClose();
        // Reset form
        setFoodRating(0);
        setDeliveryRating(0);
        setFoodComment('');
        setDeliveryComment('');
      } else {
        setError(response?.data?.message || 'Failed to submit review');
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err?.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    rating: number,
    onRate: (rating: number) => void,
    label: string
  ) => (
    <View style={styles.ratingSection}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#FFB800' : colors.gray_400}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {rating === 0 ? 'Tap to rate' : rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate Your Order</Text>
            <Text style={styles.subtitle}>Order #{orderNumber}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray_600} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Food Rating */}
            {renderStarRating(foodRating, setFoodRating, 'How was the food?')}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Delivery Rating */}
            {renderStarRating(deliveryRating, setDeliveryRating, 'How was the delivery?')}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Info Text */}
            <Text style={styles.infoText}>
              Your feedback helps us improve our service!
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (foodRating === 0 || deliveryRating === 0 || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={foodRating === 0 || deliveryRating === 0 || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_200,
  },
  title: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
    flex: 1,
  },
  subtitle: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ratingLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text_dark,
    marginBottom: spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  ratingText: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray_200,
    marginVertical: spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.small,
    color: colors.danger,
  },
  infoText: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.gray_200,
  },
  skipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text_dark,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray_400,
  },
  submitButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
