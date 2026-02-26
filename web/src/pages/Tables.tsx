import React from 'react';
import { TableManagement } from '../../../shared/dashboards/AdminDashboard/TableManagement';
import './Tables.css';

const Tables: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Table Management</h1>
          <p className="page-subtitle">Manage restaurant tables and assign waiters</p>
        </div>
      </div>
      <div className="page-content">
        <TableManagement />
      </div>
    </div>
  );
};

export default Tables;
