import React from 'react';
import { useNotifications } from '../services/NotificationContext';
import { FiX, FiBell, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { IconType } from 'react-icons';

const Icon: React.FC<{ icon: IconType; className?: string }> = ({ 
    icon: IconComponent, 
    className 
}) => <IconComponent className={className} />;

const NotificationPanel: React.FC = () => {
    const { notifications, removeNotification } = useNotifications();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed right-4 top-4 z-50 space-y-2 max-w-xs w-full">
            <style>
                {`
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }

                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }

                    .notification-enter {
                        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }

                    .notification-exit {
                        animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }

                    .notification-progress {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        height: 2px;
                        background-color: currentColor;
                        opacity: 0.2;
                        animation: progress 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }

                    @keyframes progress {
                        from {
                            width: 100%;
                        }
                        to {
                            width: 0%;
                        }
                    }
                `}
            </style>
            {notifications.map((notification) => (
                <div
                    id={`notification-${notification.id}`}
                    key={notification.id}
                    className={`${
                        notification.type === 'success' ? 'bg-green-50 text-green-800 border-green-400' :
                        notification.type === 'error' ? 'bg-red-50 text-red-800 border-red-400' :
                        'bg-blue-50 text-blue-800 border-blue-400'
                    } flex items-center border-l-2 py-2 px-3 rounded shadow-sm relative overflow-hidden notification-enter`}
                    role="alert"
                >
                    <div className="flex-shrink-0">
                        {notification.type === 'success' ? (
                            <Icon icon={FiCheck} className="h-4 w-4 text-green-500" />
                        ) : notification.type === 'error' ? (
                            <Icon icon={FiAlertCircle} className="h-4 w-4 text-red-500" />
                        ) : (
                            <Icon icon={FiBell} className="h-4 w-4 text-blue-500" />
                        )}
                    </div>
                    <div className="ml-2 mr-6 flex-1 text-sm">
                        <p className="font-medium m-0 leading-tight">
                            {notification.title}
                        </p>
                        {notification.message && (
                            <p className="text-xs mt-0.5 leading-tight opacity-90">
                                {notification.message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 ml-auto opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <span className="sr-only">Close</span>
                        <Icon icon={FiX} className="h-4 w-4" />
                    </button>
                    <div className="notification-progress" />
                </div>
            ))}
        </div>
    );
};

export default NotificationPanel;