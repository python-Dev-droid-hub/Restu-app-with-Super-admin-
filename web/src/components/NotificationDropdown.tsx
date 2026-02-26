import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  createdAt: string;
  relatedOrder?: {
    _id: string;
    orderNumber: string;
    status: string;
  };
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountUpdate: (count: number) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onUnreadCountUpdate,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.getRecentNotifications(10);
      if (response.success && response.data) {
        // The API returns the notifications array directly
        setNotifications(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      // Update unread count
      onUnreadCountUpdate(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#F44336';
      case 'HIGH': return '#FF9800';
      case 'NORMAL': return '#2196F3';
      case 'LOW': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="notification-dropdown"
      style={{
        position: 'absolute',
        top: '60px',
        right: '10px',
        width: '380px',
        maxHeight: '500px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-hover)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
          Notifications
        </h3>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#F44336',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              style={{
                padding: 'var(--space-lg)',
                borderBottom: '1px solid var(--border-color)',
                background: notification.isRead ? 'var(--bg-card)' : 'var(--bg-hover)',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
            >
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                {/* Priority indicator */}
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getPriorityColor(notification.priority),
                    flexShrink: 0,
                    marginTop: '6px',
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#2196F3',
                        }}
                      />
                    )}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                      marginBottom: '8px',
                    }}
                  >
                    {notification.body}
                  </p>

                  {notification.relatedOrder && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-hint)',
                        background: 'var(--bg-body)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-md)',
                        display: 'inline-block',
                        marginBottom: '8px',
                      }}
                    >
                      Order #{notification.relatedOrder.orderNumber}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-hint)',
                    }}
                  >
                    {formatTimeAgo(notification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: 'var(--space-md)',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: 'var(--space-sm)',
            }}
            onClick={onClose}
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
