
import React, { useState, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientList from './pages/PatientList';
import Billing from './pages/Billing';
import TestEntry from './pages/TestEntry';
import LabManagement from './pages/LabManagement';
import UserManagement from './pages/UserManagement';
import IrisWorklist from './pages/IrisWorklist';
import Encounter from './pages/Encounter';
import CreateTests from './pages/CreateTests';
import { login } from './services/api';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<{ username: string, roles: string[], organizationId: string, organizationName: string } | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, []);

    const handleLogin = async (username, password) => {
        const response = await login(username, password);
        const { token, userId, organizationId, organizationName } = response;
        const userDetails = {
            username: response.username,
            roles: [], // Assuming roles are not in the response for now
            organizationId,
            organizationName
        };
        setToken(token);
        setUser(userDetails);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userDetails));
        localStorage.setItem('organizationId', organizationId);
        localStorage.setItem('userId', userId);
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('organizationId');
    };

    return (
        <HashRouter>
            <div className="flex h-screen bg-gray-50 text-gray-800">
                {token && <Sidebar />}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header user={user} handleLogin={handleLogin} handleLogout={handleLogout} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/register-patient" element={<PatientRegistration />} />
                            <Route path="/patient-list" element={<PatientList />} />
                            <Route path="/billing" element={<Billing />} />
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
        </HashRouter>
    );
};

export default App;
