
import React, { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { navLinks } from '../constants';
import { useAuth } from '../services/AuthContext';
import { canAccessPathForRoles } from '../services/roleAccess';

const Icon: React.FC<{ name: string }> = ({ name }) => {
    const iconMap: { [key: string]: JSX.Element } = {
        home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
        'user-plus': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
        users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" />,
        beaker: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.443 2.216a2 2 0 002.164 1.773h7.14a2 2 0 002.164-1.773l.443-2.216a2 2 0 00-.547-1.806zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
        billing: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        flask: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l-4 4-4-4 4-4" />,
        radiation: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7v-2zM9 5h6v2H9V5zm6 14h-6v-2h6v2z" />,
        'user-cog': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM21.5 16.5A1.5 1.5 0 0120 18h-3a1.5 1.5 0 010-3h3a1.5 1.5 0 011.5 1.5zM17.5 12.5a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-3 0v-3a1.5 1.5 0 011.5-1.5z" />,
    };
    return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{iconMap[name]}</svg>;
};

const Sidebar: React.FC = () => {
    const { user } = useAuth();
    const currentRoles = Array.isArray(user?.roles) ? user.roles : [];
    const allowedLinks = navLinks.filter((link) => canAccessPathForRoles(link.path, currentRoles));

    return (
        <aside className="w-80 flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)' }}>
            <div className="flex items-center h-20 px-6 gap-3" style={{ 
                background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                <img 
                    src="/images/haleonelogo.png" 
                    alt="Vaidya Labs" 
                    className="h-20 w-auto object-contain"
                />
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Vaidya Health</h1>
                    <span className="text-sm font-semibold text-cyan-100 tracking-wide">VaidyaLab</span>
                </div>
            </div>
            <nav className="mt-6 px-3">
                <ul className="space-y-1">
                    {allowedLinks.map((link) => (
                        <li key={link.name}>
                            <NavLink
                                to={link.path}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out whitespace-nowrap ${
                                        isActive
                                            ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/30'
                                            : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
                                    }`
                                }
                            >
                                <Icon name={link.icon} />
                                <span className="ml-3 flex-1">{link.name}</span>
                                {(link.path === '/iris' || 
                                  link.path === '/user-management') 
                                  }
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
