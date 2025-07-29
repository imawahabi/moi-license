import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AddLicense from './components/AddLicense';
import LicenseList from './components/LicenseList';
import EmployeeList from './components/EmployeeList';
import Reports from './components/Reports';
import DataImporter from './components/DataImporter';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-license':
        return <AddLicense />;
      case 'licenses':
        return <LicenseList />;
      case 'employees':
        return <EmployeeList />;
      case 'reports':
        return <Reports />;
      case 'data-importer':
        return <DataImporter />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;