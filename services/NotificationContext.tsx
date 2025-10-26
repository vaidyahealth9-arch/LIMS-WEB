import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconType } from 'react-icons';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    persist?: boolean; // Whether to store in notification history
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = Date.now().toString();
        const duration = 2000; // Fixed 2 seconds duration

        setNotifications(prev => [...prev, { ...notification, id }]);

        // Automatically remove notification after duration
        setTimeout(() => {
            // Add exit animation class
            const element = document.getElementById(`notification-${id}`);
            if (element) {
                element.classList.add('notification-exit');
                // Remove after animation completes
                setTimeout(() => removeNotification(id), 300);
            } else {
                removeNotification(id);
            }
        }, duration);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};