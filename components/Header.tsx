
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="flex items-center justify-end h-20 px-6 bg-white border-b flex-shrink-0">
            <div className="flex items-center">
                <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                </button>
                <div className="ml-4 flex items-center">
                    <div className="flex flex-col text-right">
                         <span className="text-sm font-semibold text-gray-700">Admin | Manager</span>
                         <span className="text-xs text-gray-500">Diagnostic Lab A</span>
                    </div>
                    <img className="w-10 h-10 ml-3 rounded-full object-cover" src="https://picsum.photos/100" alt="User" />
                </div>
            </div>
        </header>
    );
};

export default Header;
