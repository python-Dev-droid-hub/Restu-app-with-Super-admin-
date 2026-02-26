import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { api } from '../../components/api/client';

interface Manager {
  _id: string;
  displayName: string;
  email: string;
  rating: number;
  currentBranch?: string;
  experience?: string;
}

interface AssignBranchManagerModalProps {
  visible: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  currentManager?: {
    _id: string;
    displayName: string;
    rating: number;
  } | null;
  onAssign: (managerId: string) => void;
}

export default function AssignBranchManagerModal({
  visible,
  onClose,
  branchId,
  branchName,
  currentManager,
  onAssign,
}: AssignBranchManagerModalProps) {
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAvailableManagers();
    }
  }, [visible]);

  const loadAvailableManagers = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from the backend
      // For now, using mock data
      const mockManagers: Manager[] = [
        {
          _id: 'manager-1',
          displayName: 'Sarah Smith',
          email: 'sarah@restaurant.com',
          rating: 4.8,
          currentBranch: 'Not assigned',
          experience: '3 years',
        },
        {
          _id: 'manager-2',
          displayName: 'Mike Johnson',
          email: 'mike@restaurant.com',
          rating: 4.6,
          currentBranch: 'North Branch',
          experience: '2 years',
        },
        {
          _id: 'manager-3',
          displayName: 'Emma Lee',
          email: 'emma@restaurant.com',
          rating: 4.7,
          currentBranch: 'Not assigned',
          experience: '4 years',
        },
        {
          _id: 'manager-4',
          displayName: 'David Brown',
          email: 'david@restaurant.com',
          rating: 4.5,
          currentBranch: 'Not assigned',
          experience: '1 year',
        },
      ];
      
      setAvailableManagers(mockManagers);
    } catch (error) {
      console.error('Error loading managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedManager) return;
    
    try {
      setAssigning(true);
      // Call API to assign manager
      await api.post(`/branches/${branchId}/assign-manager`, {
        managerId: selectedManager._id,
      });
      
      onAssign(selectedManager._id);
      onClose();
    } catch (error) {
      console.error('Error assigning manager:', error);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Assign Branch Manager</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Branch Info */}
          <View style={styles.branchInfo}>
            <Text style={styles.branchLabel}>Branch:</Text>
            <Text style={styles.branchName}>{branchName}</Text>
            
            {currentManager && (
              <>
                <Text style={styles.currentManagerLabel}>Current Manager:</Text>
                <View style={styles.currentManagerRow}>
                  <Ionicons name="person" size={16} color={COLORS.lightText} />
                  <Text style={styles.currentManagerName}>
                    {currentManager.displayName}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{currentManager.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Manager Selection */}
          <Text style={styles.selectLabel}>Select New Manager:</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.orange} />
              <Text style={styles.loadingText}>Loading managers...</Text>
            </View>
          ) : (
            <ScrollView style={styles.managersList}>
              {availableManagers.map((manager) => (
                <TouchableOpacity
                  key={manager._id}
                  style={[
                    styles.managerItem,
                    selectedManager?._id === manager._id && styles.managerItemSelected,
                  ]}
                  onPress={() => setSelectedManager(manager)}
                >
                  <View style={styles.managerRow}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                    
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerName}>{manager.displayName}</Text>
                      <Text style={styles.managerEmail}>{manager.email}</Text>
                      <Text style={styles.managerDetails}>
                        {manager.currentBranch} • {manager.experience}
                      </Text>
                    </View>
                    
                    <View style={styles.managerStats}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingValue}>{manager.rating.toFixed(1)}</Text>
                      </View>
                      
                      {selectedManager?._id === manager._id && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.orange} />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Selected Manager Preview */}
          {selectedManager && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Selected Manager</Text>
              <View style={styles.previewContent}>
                <View style={styles.previewAvatar}>
                  <Ionicons name="person" size={32} color="#fff" />
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{selectedManager.displayName}</Text>
                  <Text style={styles.previewBranch}>
                    Current: {selectedManager.currentBranch}
                  </Text>
                  <View style={styles.previewRating}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.previewRatingText}>
                      {selectedManager.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.previewExperience}>
                      • {selectedManager.experience} experience
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.assignButton, (!selectedManager || assigning) && styles.assignButtonDisabled]}
              onPress={handleAssign}
              disabled={!selectedManager || assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.assignButtonText}>Assign Manager</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: getSpacing(20),
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(20),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  closeButton: {
    padding: 4,
  },
  branchInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: getSpacing(12),
    marginBottom: getSpacing(16),
  },
  branchLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  currentManagerLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 8,
    marginBottom: 4,
  },
  currentManagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentManagerName: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#FF8C42',
    fontWeight: '600',
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: getSpacing(12),
  },
  loadingContainer: {
    paddingVertical: getSpacing(40),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getSpacing(12),
    fontSize: 14,
    color: COLORS.lightText,
  },
  managersList: {
    maxHeight: 250,
    marginBottom: getSpacing(16),
  },
  managerItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(12),
    marginBottom: getSpacing(8),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  managerItemSelected: {
    borderColor: COLORS.orange,
    backgroundColor: '#FFF3E0',
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(12),
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  managerEmail: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 2,
  },
  managerDetails: {
    fontSize: 11,
    color: '#95A5A6',
  },
  managerStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8C42',
  },
  selectedIndicator: {
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: getSpacing(12),
    marginBottom: getSpacing(16),
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 8,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(12),
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  previewBranch: {
    fontSize: 13,
    color: COLORS.lightText,
    marginBottom: 4,
  },
  previewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  previewExperience: {
    fontSize: 12,
    color: '#95A5A6',
  },
  actions: {
    gap: 8,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 8,
  },
  assignButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: COLORS.lightText,
  },
});
