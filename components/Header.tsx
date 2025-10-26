import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../services/NotificationContext';

const Header: React.FC<{ user: { username: string, roles: string[], organizationName: string } | null, handleLogout: Function }> = ({ user, handleLogout }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationHistory, setNotificationHistory] = useState<Array<{ title: string; message?: string; type: string; timestamp: Date; read: boolean }>>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const { notifications } = useNotifications();

    // Track notification history
    useEffect(() => {
        if (notifications.length > 0) {
            const latestNotification = notifications[notifications.length - 1];
            // Only add to history if persist is true (default to false for validation errors)
            if (latestNotification.persist !== false) {
                setNotificationHistory(prev => [
                    {
                        title: latestNotification.title,
                        message: latestNotification.message,
                        type: latestNotification.type,
                        timestamp: new Date(),
                        read: false
                    },
                    ...prev
                ].slice(0, 10)); // Keep only last 10 notifications
            }
        }
    }, [notifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTimeAgo = (timestamp: Date) => {
        const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <header className="flex items-center justify-end h-20 px-6 bg-white border-b flex-shrink-0">
            {user && (
                <div className="flex items-center gap-2">
                    {/* Notification Bell */}
                    <div className="relative" ref={notificationRef}>
                        <button 
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className="relative p-2 text-gray-500 rounded-lg hover:bg-cyan-50 hover:text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {notificationHistory.filter(n => !n.read).length > 0 && (
                                <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                                    {notificationHistory.filter(n => !n.read).length}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotificationOpen && (
                            <div className="absolute right-0 top-14 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-cyan-500 to-teal-600">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        Notifications
                                    </h3>
                                </div>

                                {/* Notification List */}
                                <div className="overflow-y-auto flex-1">
                                    {notificationHistory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-400">
                                            <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="text-sm font-medium">No notifications yet</p>
                                            <p className="text-xs mt-1">You're all caught up!</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {notificationHistory.map((notif, index) => (
                                                <div
                                                    key={index}
                                                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-cyan-50/30' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                            notif.type === 'success' ? 'bg-emerald-100' :
                                                            notif.type === 'error' ? 'bg-red-100' :
                                                            'bg-cyan-100'
                                                        }`}>
                                                            {notif.type === 'success' ? (
                                                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : notif.type === 'error' ? (
                                                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                                                                {!notif.read && (
                                                                    <span className="flex-shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-1"></span>
                                                                )}
                                                            </div>
                                                            {notif.message && (
                                                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notif.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {notificationHistory.length > 0 && (
                                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                                        <button 
                                            onClick={() => setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })))}
                                            className="flex-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors py-2 hover:bg-white rounded-lg"
                                        >
                                            Mark as Read
                                        </button>
                                        <button 
                                            onClick={() => setNotificationHistory([])}
                                            className="flex-1 text-xs font-semibold text-gray-600 hover:text-gray-700 transition-colors py-2 hover:bg-white rounded-lg"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="ml-4 flex items-center relative" ref={dropdownRef}>
                        <div className="flex flex-col text-right">
                            <span className="text-sm font-semibold text-gray-700">{user.username}</span>
                            <span className="text-xs text-gray-500">{user.organizationName}</span>
                        </div>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="ml-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full"
                        >
                            <img className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-cyan-400 transition-colors" src="https://picsum.photos/100" alt="User" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                                    <p className="text-xs text-gray-500 mt-1">{user.organizationName}</p>
                                    {user.roles && user.roles.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {user.roles.map((role, index) => (
                                                <span key={index} className="px-2 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Logout Button */}
                                <div className="pt-1">
                                    <button 
                                        onClick={() => handleLogout()} 
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;