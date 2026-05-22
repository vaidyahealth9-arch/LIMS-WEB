import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionSummary {
    isOnTrial: boolean;
    hasActiveSubscription: boolean;
    currentPlanName: string;
    status: string;
    expiryDate: string;
}

interface SubscriptionContextType {
    subscription: SubscriptionSummary | null;
    loading: boolean;
    isSubscribed: boolean;
    remainingTime: string;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [remainingTime, setRemainingTime] = useState<string>('');

    const fetchSubscription = async () => {
        if (!isAuthenticated || !user?.organizationId) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/subscriptions/organization/${user.organizationId}/summary`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSubscription(data);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [isAuthenticated, user?.organizationId]);

    // Live countdown timer
    useEffect(() => {
        if (!subscription?.expiryDate) {
            setRemainingTime('');
            return;
        }

        const updateTimer = () => {
            const expiry = new Date(subscription.expiryDate).getTime();
            const now = new Date().getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setRemainingTime('Expired');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            if (hours > 0 || days > 0) timeStr += `${hours}h `;
            timeStr += `${minutes}m`;
            
            setRemainingTime(timeStr);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [subscription?.expiryDate]);

    const isSubscribed = !!(subscription?.hasActiveSubscription && remainingTime !== 'Expired');

    return (
        <SubscriptionContext.Provider value={{ 
            subscription, 
            loading, 
            isSubscribed, 
            remainingTime,
            refreshSubscription: fetchSubscription 
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
