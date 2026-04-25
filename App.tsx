import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider, useAuth } from './services/AuthContext';
import { NotificationProvider } from './services/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import NotificationPanel from './components/NotificationPanel';
import { canAccessPathForRoles, getDefaultPathForRoles } from './services/roleAccess';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const PatientList = lazy(() => import('./pages/PatientList').then((m) => ({ default: m.PatientList })));
const BillList = lazy(() => import('./pages/BillList').then((m) => ({ default: m.BillList })));
const TestEntry = lazy(() => import('./pages/TestEntry'));
const LabManagement = lazy(() => import('./pages/LabManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

const Encounter = lazy(() => import('./pages/Encounter'));
const CreateTests = lazy(() => import('./pages/CreateTests'));
const ViewObservations = lazy(() => import('./pages/ViewObservations'));
const PatientData = lazy(() => import('./pages/PatientData'));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

const RouteFallback = () => (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Loading...
    </div>
);

const GuardedRoute: React.FC<{ path: string; element: React.ReactElement }> = ({ path, element }) => {
    const { user } = useAuth();
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (!canAccessPathForRoles(path, roles)) {
        return <Navigate to={getDefaultPathForRoles(roles)} replace />;
    }
    return element;
};

const MainLayout = () => {
    const { user, logout } = useAuth();
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const defaultPath = getDefaultPathForRoles(roles);
    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} handleLogout={logout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/" element={<GuardedRoute path="/" element={<Dashboard />} />} />
                            <Route path="/register-patient" element={<GuardedRoute path="/register-patient" element={<PatientRegistration />} />} />
                            <Route path="/patient-list" element={<GuardedRoute path="/patient-list" element={<PatientList />} />} />
                            <Route path="/billing" element={<GuardedRoute path="/billing" element={<BillList />} />} />
                            <Route path="/entry-verify" element={<GuardedRoute path="/entry-verify" element={<TestEntry />} />} />
                            <Route path="/lab-management" element={<GuardedRoute path="/lab-management" element={<LabManagement />} />} />
                            <Route path="/user-management" element={<GuardedRoute path="/user-management" element={<UserManagement />} />} />

                            <Route path="/encounter" element={<GuardedRoute path="/encounter" element={<Encounter />} />} />
                            <Route path="/create-tests" element={<GuardedRoute path="/create-tests" element={<CreateTests />} />} />
                            <Route path="/view-observations" element={<GuardedRoute path="/view-observations" element={<ViewObservations />} />} />
                            <Route path="/patient-data" element={<GuardedRoute path="/patient-data" element={<PatientData />} />} />
                            <Route path="*" element={<Navigate to={defaultPath} replace />} />
                        </Routes>
                    </Suspense>
                </main>
            </div>
        </div>
    )
}

const App: React.FC = () => {
    return (
        <AuthProvider>
            <NotificationProvider>
                <HashRouter>
                    <NotificationPanel />
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route element={<PrivateRoute />}>
                                <Route path="/*" element={<MainLayout />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </HashRouter>
            </NotificationProvider>
        </AuthProvider>
    );
};

export default App;