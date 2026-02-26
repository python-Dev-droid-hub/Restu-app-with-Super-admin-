import React from 'react';
import NotificationDropdown from '../components/NotificationDropdown';
import './Notifications.css';

const Notifications: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">View all your notifications and alerts</p>
        </div>
      </div>
      <div className="page-content">
        <div className="notifications-fullpage">
          <NotificationDropdown 
            isOpen={true} 
            onClose={() => {}} 
            unreadCount={0}
            onUnreadCountUpdate={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default Notifications;
