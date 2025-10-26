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
        <div className="fixed right-6 top-24 z-50 space-y-3 max-w-sm w-full">
            <style>
                {`
                    @keyframes slideInRight {
                        from {
                            transform: translateX(120%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }

                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(120%);
                            opacity: 0;
                        }
                    }

                    .notification-enter {
                        animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }

                    .notification-exit {
                        animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }

                    .notification-progress {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        height: 3px;
                        background: linear-gradient(90deg, currentColor, transparent);
                        animation: progress 2s linear forwards;
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
                        notification.type === 'success' 
                            ? 'bg-white border-l-4 border-emerald-500' :
                        notification.type === 'error' 
                            ? 'bg-white border-l-4 border-red-500' :
                        'bg-white border-l-4 border-cyan-500'
                    } flex items-start p-4 rounded-xl shadow-lg relative overflow-hidden notification-enter backdrop-blur-sm`}
                    style={{ 
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)' 
                    }}
                    role="alert"
                >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === 'success' 
                            ? 'bg-emerald-100' :
                        notification.type === 'error' 
                            ? 'bg-red-100' :
                        'bg-cyan-100'
                    }`}>
                        {notification.type === 'success' ? (
                            <Icon icon={FiCheck} className="h-5 w-5 text-emerald-600" />
                        ) : notification.type === 'error' ? (
                            <Icon icon={FiAlertCircle} className="h-5 w-5 text-red-600" />
                        ) : (
                            <Icon icon={FiBell} className="h-5 w-5 text-cyan-600" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="ml-3 mr-8 flex-1">
                        <p className={`font-semibold text-sm m-0 leading-tight ${
                            notification.type === 'success' 
                                ? 'text-emerald-900' :
                            notification.type === 'error' 
                                ? 'text-red-900' :
                            'text-cyan-900'
                        }`}>
                            {notification.title}
                        </p>
                        {notification.message && (
                            <p className="text-xs mt-1 leading-tight text-gray-600 m-0">
                                {notification.message}
                            </p>
                        )}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="absolute top-3 right-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    >
                        <span className="sr-only">Close</span>
                        <Icon icon={FiX} className="h-4 w-4" />
                    </button>

                    {/* Progress Bar */}
                    <div className={`notification-progress ${
                        notification.type === 'success' 
                            ? 'text-emerald-500' :
                        notification.type === 'error' 
                            ? 'text-red-500' :
                        'text-cyan-500'
                    }`} />
                </div>
            ))}
        </div>
    );
};

export default NotificationPanel;