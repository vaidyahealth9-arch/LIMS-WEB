import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSubscription } from '../services/SubscriptionContext';
import BlockingOverlay from './BlockingOverlay';

const SubscriptionGuard = () => {
    const { isSubscribed, loading } = useSubscription();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    // Always allow access to subscription page
    if (location.pathname === '/subscription') {
        return <Outlet />;
    }

    return (
        <>
            <Outlet />
            {!isSubscribed && <BlockingOverlay />}
        </>
    );
};

export default SubscriptionGuard;
