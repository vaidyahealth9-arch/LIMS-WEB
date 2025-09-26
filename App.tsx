
import React from 'react';
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

const App: React.FC = () => {
    return (
        <HashRouter>
            <div className="flex h-screen bg-gray-50 text-gray-800">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/register-patient" element={<PatientRegistration />} />
                            <Route path="/patient-list" element={<PatientList />} />
                            <Route path="/billing" element={<Billing />} />
                            <Route path="/entry-verify" element={<TestEntry />} />
                            <Route path="/lab-management" element={<LabManagement />} />
                            {/* FIX: Corrected a typo in the Route component. The '有名' prop does not exist and has been replaced with the correct 'element' prop. */}
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
