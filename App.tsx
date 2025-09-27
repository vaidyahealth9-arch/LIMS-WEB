
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
import { login } from './services/api';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<{ username: string, roles: string[] } | null>(null);

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
        const { token, userDetails } = response;
        setToken(token);
        setUser(userDetails);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userDetails));
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
                        </Routes>
                    </main>
                </div>
            </div>
        </HashRouter>
    );
};

export default App;
