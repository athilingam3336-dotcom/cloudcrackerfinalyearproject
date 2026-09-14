import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BusinessAnalyticsData } from '@/services/adminService';

interface NeedsYourAttentionModalProps {
  visible: boolean;
  onClose: () => void;
  analyticsData: BusinessAnalyticsData | null;
  onNavigateToOrders: () => void;
  onNavigateToInventory: () => void;
  onNavigateToDelivery: () => void;
}

export const NeedsYourAttentionModal: React.FC<NeedsYourAttentionModalProps> = ({
  visible,
  onClose,
  analyticsData,
  onNavigateToOrders,
  onNavigateToInventory,
  onNavigateToDelivery,
}) => {
  const pendingOrdersCount = analyticsData?.orderBreakdown?.pendingOrders ?? 0;
  const lowStockCount =
    (analyticsData?.inventoryDistribution?.lowStock || 0) +
    (analyticsData?.inventoryDistribution?.outOfStock || 0);
  const readyDeliveryCount = analyticsData?.orderBreakdown?.completedOrders ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.card}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="notifications-active" size={22} color="#DC2626" />
                </View>
                <View style={styles.headerTextGroup}>
                  <Text style={styles.title}>Needs Your Attention</Text>
                  <Text style={styles.subtitle}>
                    Action items requiring immediate admin intervention
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Alert List */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Alert 1: Pending Orders */}
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
                onPress={() => {
                  onClose();
                  onNavigateToOrders();
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.alertIconCircle, { backgroundColor: '#DC2626' }]}>
                      <MaterialIcons name="receipt-long" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.titleContainer}>
                      <Text style={styles.alertTitle}>Pending Orders</Text>
                      <View style={[styles.badgePill, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.badgePillText, { color: '#DC2626' }]}>
                          {pendingOrdersCount} Pending
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}>
                    <Text style={styles.actionBtnText}>View Orders →</Text>
                  </View>
                </View>
                <Text style={styles.alertSubText}>
                  Customers waiting for order confirmation & payment verification.
                </Text>
              </TouchableOpacity>

              {/* Alert 2: Products Low Stock */}
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}
                onPress={() => {
                  onClose();
                  onNavigateToInventory();
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.alertIconCircle, { backgroundColor: '#D97706' }]}>
                      <MaterialIcons name="inventory" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.titleContainer}>
                      <Text style={styles.alertTitle}>Products Low Stock</Text>
                      <View style={[styles.badgePill, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.badgePillText, { color: '#D97706' }]}>
                          {lowStockCount} Items
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.actionBtn, { backgroundColor: '#D97706' }]}>
                    <Text style={styles.actionBtnText}>Check Inventory →</Text>
                  </View>
                </View>
                <Text style={styles.alertSubText}>
                  Restock warehouse soon to prevent stockouts & missing sales.
                </Text>
              </TouchableOpacity>

              {/* Alert 3: Orders Ready for Delivery */}
              <TouchableOpacity
                style={[styles.alertCard, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}
                onPress={() => {
                  onClose();
                  onNavigateToDelivery();
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.alertIconCircle, { backgroundColor: '#2563EB' }]}>
                      <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.titleContainer}>
                      <Text style={styles.alertTitle}>Ready for Delivery</Text>
                      <View style={[styles.badgePill, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={[styles.badgePillText, { color: '#2563EB' }]}>
                          {readyDeliveryCount} Orders
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}>
                    <Text style={styles.actionBtnText}>View Delivery →</Text>
                  </View>
                </View>
                <Text style={styles.alertSubText}>
                  Dispatch packages & notify customers with tracking details.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.dismissBtnText}>Close Alert Panel</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '95%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollBody: {
    maxHeight: 400,
    width: '100%',
  },
  scrollContent: {
    paddingVertical: 2,
  },
  alertCard: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  alertTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 8,
    flexShrink: 0,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  alertSubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  dismissBtn: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  dismissBtnText: {
    color: '#334155',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
});

export default NeedsYourAttentionModal;


