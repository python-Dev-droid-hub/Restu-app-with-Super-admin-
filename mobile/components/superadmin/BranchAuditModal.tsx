import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';

type AuditTab = 'overview' | 'financial' | 'operations' | 'staff';

interface BranchAuditModalProps {
  visible: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  managerName?: string;
}

export default function BranchAuditModal({
  visible,
  onClose,
  branchId,
  branchName,
  managerName,
}: BranchAuditModalProps) {
  const [activeTab, setActiveTab] = useState<AuditTab>('overview');

  // Mock audit data
  const auditData = {
    overview: {
      createdDate: 'Jan 15, 2024',
      status: 'Active',
      daysOperating: 45,
      performanceScore: 98,
    },
    financial: {
      totalRevenue: 185000,
      dailyAverage: 5968,
      topEarningDay: '$8,500 (Feb 20)',
      lowestEarningDay: '$4,200 (Feb 5)',
      monthlyRevenue: [
        { month: 'Jan', amount: 55000 },
        { month: 'Feb', amount: 62000 },
        { month: 'Mar', amount: 68000 },
      ],
    },
    operations: {
      totalOrders: 1245,
      completionRate: 96,
      avgOrderValue: 55.55,
      avgPreparationTime: '12 min',
      avgDeliveryTime: '28 min',
      customerSatisfaction: 4.8,
    },
    staff: {
      totalStaff: 15,
      chefs: 4,
      waiters: 6,
      riders: 5,
      attendanceRate: 94,
      topPerformer: 'John Doe',
    },
  };

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{auditData.overview.createdDate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#D4EDDA' }]}>
                  <Text style={[styles.statusText, { color: '#155724' }]}>
                    {auditData.overview.status}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Days Operating</Text>
                <Text style={styles.infoValue}>{auditData.overview.daysOperating} days</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Performance Score</Text>
                <Text style={[styles.infoValue, styles.scoreValue]}>
                  {auditData.overview.performanceScore}%
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="cash" size={24} color={COLORS.orange} />
                <Text style={styles.summaryValue}>{formatCurrency(auditData.financial.totalRevenue)}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="cart" size={24} color={COLORS.blue} />
                <Text style={styles.summaryValue}>{auditData.operations.totalOrders}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="people" size={24} color={COLORS.green} />
                <Text style={styles.summaryValue}>{auditData.staff.totalStaff}</Text>
                <Text style={styles.summaryLabel}>Staff Count</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="star" size={24} color="#F39C12" />
                <Text style={styles.summaryValue}>{auditData.operations.customerSatisfaction}</Text>
                <Text style={styles.summaryLabel}>Customer Rating</Text>
              </View>
            </View>
          </View>
        );

      case 'financial':
        return (
          <View style={styles.tabContent}>
            <View style={styles.financialCard}>
              <Text style={styles.financialTitle}>Total Revenue</Text>
              <Text style={styles.financialAmount}>{formatCurrency(auditData.financial.totalRevenue)}</Text>
              <Text style={styles.financialPeriod}>This Month</Text>
              
              <View style={styles.financialStats}>
                <View style={styles.financialStat}>
                  <Text style={styles.financialStatLabel}>Daily Average</Text>
                  <Text style={styles.financialStatValue}>{formatCurrency(auditData.financial.dailyAverage)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.extremesCard}>
              <View style={styles.extremeItem}>
                <Ionicons name="trending-up" size={20} color={COLORS.green} />
                <View>
                  <Text style={styles.extremeLabel}>Top Earning Day</Text>
                  <Text style={styles.extremeValue}>{auditData.financial.topEarningDay}</Text>
                </View>
              </View>
              <View style={styles.extremeDivider} />
              <View style={styles.extremeItem}>
                <Ionicons name="trending-down" size={20} color={COLORS.error} />
                <View>
                  <Text style={styles.extremeLabel}>Lowest Earning Day</Text>
                  <Text style={styles.extremeValue}>{auditData.financial.lowestEarningDay}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Monthly Revenue Trend</Text>
            <View style={styles.chartCard}>
              {auditData.financial.monthlyRevenue.map((item, index) => (
                <View key={index} style={styles.chartRow}>
                  <Text style={styles.chartMonth}>{item.month}</Text>
                  <View style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          width: `${(item.amount / 70000) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'operations':
        return (
          <View style={styles.tabContent}>
            <View style={styles.operationsGrid}>
              <View style={styles.operationCard}>
                <Text style={styles.operationValue}>{auditData.operations.totalOrders}</Text>
                <Text style={styles.operationLabel}>Total Orders</Text>
              </View>
              <View style={styles.operationCard}>
                <Text style={styles.operationValue}>{auditData.operations.completionRate}%</Text>
                <Text style={styles.operationLabel}>Completion Rate</Text>
              </View>
              <View style={styles.operationCard}>
                <Text style={styles.operationValue}>${auditData.operations.avgOrderValue}</Text>
                <Text style={styles.operationLabel}>Avg Order Value</Text>
              </View>
              <View style={styles.operationCard}>
                <Text style={styles.operationValue}>{auditData.operations.avgPreparationTime}</Text>
                <Text style={styles.operationLabel}>Avg Prep Time</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricItem}>
                <Ionicons name="bicycle" size={20} color={COLORS.blue} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Avg Delivery Time</Text>
                  <Text style={styles.metricValue}>{auditData.operations.avgDeliveryTime}</Text>
                </View>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Ionicons name="happy" size={20} color={COLORS.green} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Customer Satisfaction</Text>
                  <Text style={styles.metricValue}>{auditData.operations.customerSatisfaction}/5.0</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'staff':
        return (
          <View style={styles.tabContent}>
            <View style={styles.staffOverviewCard}>
              <Text style={styles.staffTotal}>{auditData.staff.totalStaff}</Text>
              <Text style={styles.staffTotalLabel}>Total Staff</Text>
              
              <View style={styles.staffBreakdown}>
                <View style={styles.staffType}>
                  <Ionicons name="restaurant" size={20} color={COLORS.orange} />
                  <Text style={styles.staffCount}>{auditData.staff.chefs}</Text>
                  <Text style={styles.staffLabel}>Chefs</Text>
                </View>
                <View style={styles.staffType}>
                  <Ionicons name="people" size={20} color={COLORS.blue} />
                  <Text style={styles.staffCount}>{auditData.staff.waiters}</Text>
                  <Text style={styles.staffLabel}>Waiters</Text>
                </View>
                <View style={styles.staffType}>
                  <Ionicons name="bicycle" size={20} color={COLORS.green} />
                  <Text style={styles.staffCount}>{auditData.staff.riders}</Text>
                  <Text style={styles.staffLabel}>Riders</Text>
                </View>
              </View>
            </View>

            <View style={styles.attendanceCard}>
              <View style={styles.attendanceHeader}>
                <Ionicons name="calendar" size={20} color={COLORS.orange} />
                <Text style={styles.attendanceTitle}>Attendance Rate</Text>
              </View>
              <Text style={styles.attendanceValue}>{auditData.staff.attendanceRate}%</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${auditData.staff.attendanceRate}%` }]} />
              </View>
            </View>

            <View style={styles.performerCard}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <View style={styles.performerInfo}>
                <Text style={styles.performerLabel}>Top Performer</Text>
                <Text style={styles.performerName}>{auditData.staff.topPerformer}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
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
            <View>
              <Text style={styles.headerTitle}>Branch Audit Report</Text>
              <Text style={styles.branchInfo}>{branchName}</Text>
              {managerName && (
                <Text style={styles.managerInfo}>Manager: {managerName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            {[
              { id: 'overview', label: 'Overview', icon: 'grid' },
              { id: 'financial', label: 'Financial', icon: 'cash' },
              { id: 'operations', label: 'Operations', icon: 'settings' },
              { id: 'staff', label: 'Staff', icon: 'people' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id as AuditTab)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.id ? COLORS.orange : '#95A5A6'}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderTabContent()}
          </ScrollView>

          {/* Export Buttons */}
          <View style={styles.exportContainer}>
            <TouchableOpacity style={styles.exportButtonPDF}>
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButtonExcel}>
              <Ionicons name="grid" size={18} color="#fff" />
              <Text style={styles.exportButtonText}>Export Excel</Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeActionButton} onPress={onClose}>
            <Text style={styles.closeActionText}>Close</Text>
          </TouchableOpacity>
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
    maxHeight: '85%',
    padding: getSpacing(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getSpacing(16),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  branchInfo: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: 4,
  },
  managerInfo: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: getSpacing(16),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: getSpacing(12),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  tabActive: {
    borderBottomColor: COLORS.orange,
  },
  tabText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  tabTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
  },
  tabContent: {
    paddingBottom: getSpacing(16),
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
    marginBottom: getSpacing(16),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  scoreValue: {
    color: COLORS.green,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(12),
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
  },
  financialCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(20),
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: getSpacing(16),
  },
  financialTitle: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 8,
  },
  financialAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.orange,
  },
  financialPeriod: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 16,
  },
  financialStats: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  financialStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialStatLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  financialStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  extremesCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
    marginBottom: getSpacing(16),
  },
  extremeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  extremeDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  extremeLabel: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  extremeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: getSpacing(12),
  },
  chartCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartMonth: {
    width: 40,
    fontSize: 14,
    color: COLORS.darkText,
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: COLORS.orange,
    borderRadius: 4,
  },
  chartAmount: {
    width: 80,
    fontSize: 13,
    color: COLORS.darkText,
    textAlign: 'right',
  },
  operationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: getSpacing(16),
  },
  operationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
    alignItems: 'center',
  },
  operationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  operationLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
  },
  metricCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 2,
  },
  staffOverviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(20),
    marginBottom: getSpacing(16),
    alignItems: 'center',
  },
  staffTotal: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.orange,
  },
  staffTotalLabel: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 16,
  },
  staffBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  staffType: {
    alignItems: 'center',
  },
  staffCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 8,
  },
  staffLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 2,
  },
  attendanceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: getSpacing(16),
    marginBottom: getSpacing(16),
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  attendanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 8,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: getSpacing(16),
    gap: 12,
  },
  performerInfo: {
    flex: 1,
  },
  performerLabel: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  performerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 2,
  },
  exportContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: getSpacing(16),
    marginBottom: getSpacing(12),
  },
  exportButtonPDF: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonExcel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  closeActionButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeActionText: {
    fontSize: 14,
    color: COLORS.lightText,
  },
});
