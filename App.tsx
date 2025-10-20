import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import { PatientList } from './pages/PatientList';
import { BillList } from './pages/BillList';
import TestEntry from './pages/TestEntry';
import LabManagement from './pages/LabManagement';
import UserManagement from './pages/UserManagement';
import IrisWorklist from './pages/IrisWorklist';
import Encounter from './pages/Encounter';
import CreateTests from './pages/CreateTests';
import { AuthProvider, useAuth } from './services/AuthContext';
import { LoginPage } from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';

const MainLayout = () => {
    const { user, logout } = useAuth();
    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} handleLogout={logout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/register-patient" element={<PatientRegistration />} />
                        <Route path="/patient-list" element={<PatientList />} />
                        <Route path="/billing" element={<BillList />} />
                        <Route path="/entry-verify" element={<TestEntry />} />
                        <Route path="/lab-management" element={<LabManagement />} />
                        <Route path="/user-management" element={<UserManagement />} />
                        <Route path="/iris" element={<IrisWorklist />} />
                        <Route path="/encounter" element={<Encounter />} />
                        <Route path="/create-tests" element={<CreateTests />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

const App: React.FC = () => {
    return (
        <AuthProvider>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<PrivateRoute />}>
                        <Route path="/*" element={<MainLayout />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
};

export default App;