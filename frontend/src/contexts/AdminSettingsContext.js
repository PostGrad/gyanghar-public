import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminSettingsContext = createContext();

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error('useAdminSettings must be used within AdminSettingsProvider');
  }
  return context;
};

export const AdminSettingsProvider = ({ children }) => {
  const [showInactiveStudents, setShowInactiveStudents] = useState(() => {
    // Load from localStorage on initial mount
    const saved = localStorage.getItem('admin_show_inactive_students');
    return saved === 'true';
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_show_inactive_students', showInactiveStudents.toString());
  }, [showInactiveStudents]);

  const toggleShowInactiveStudents = () => {
    setShowInactiveStudents(prev => !prev);
  };

  return (
    <AdminSettingsContext.Provider 
      value={{ 
        showInactiveStudents, 
        setShowInactiveStudents,
        toggleShowInactiveStudents 
      }}
    >
      {children}
    </AdminSettingsContext.Provider>
  );
};

