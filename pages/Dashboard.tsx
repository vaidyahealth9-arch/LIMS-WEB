
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const kpiData = [
    { title: 'New Patients Today', value: '45', change: '+6%', icon: 'user-plus', color: 'cyan' },
    { title: 'ABHA Linked', value: '67%', change: '+4%', icon: 'link', color: 'teal' },
    { title: 'Revenue Today', value: '₹50,000', change: '+5%', icon: 'rupee', color: 'emerald' },
    { title: 'Invoices Today', value: '120', change: '', icon: 'invoice', color: 'sky' },
    { title: 'Pending Entries', value: '8', change: '-2', icon: 'beaker', color: 'slate' },
];

const revenueData = [
    { name: 'Mon', Revenue: 4000 },
    { name: 'Tue', Revenue: 3000 },
    { name: 'Wed', Revenue: 2000 },
    { name: 'Thu', Revenue: 2780 },
    { name: 'Fri', Revenue: 1890 },
    { name: 'Sat', Revenue: 2390 },
    { name: 'Sun', Revenue: 3490 },
];

const tatData = [
    { name: 'CBC', TAT: 2.5 },
    { name: 'LFT', TAT: 4 },
    { name: 'KFT', TAT: 4.5 },
    { name: 'Lipid', TAT: 3 },
    { name: 'Urine R/M', TAT: 1.5 },
];

const Icon: React.FC<{ name: string, className: string }> = ({ name, className }) => {
    const iconMap: { [key: string]: JSX.Element } = {
        'user-plus': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
        link: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
        rupee: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 4h4m-8 4h8M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
        invoice: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        beaker: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.443 2.216a2 2 0 002.164 1.773h7.14a2 2 0 002.164-1.773l.443-2.216a2 2 0 00-.547-1.806zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
    };
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{iconMap[name]}</svg>;
}

const KPICard: React.FC<{ title: string, value: string, change: string, icon: string, color: string }> = ({ title, value, change, icon, color }) => {
    const colors: { [key: string]: string } = {
        cyan: 'from-cyan-500 to-cyan-600',
        teal: 'from-teal-500 to-teal-600',
        emerald: 'from-emerald-500 to-emerald-600',
        sky: 'from-sky-500 to-sky-600',
        slate: 'from-slate-500 to-slate-600',
    };
    const changeColor = change.startsWith('+') ? 'text-cyan-100' : change.startsWith('-') ? 'text-red-200' : '';

    return (
        <div className={`bg-gradient-to-br ${colors[color]} text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex justify-between items-center border border-white/20`}>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">{title}</p>
                <p className="text-3xl font-bold mb-1">{value}</p>
                {change && <p className={`text-sm font-medium ${changeColor}`}>{change} vs prev period</p>}
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <Icon name={icon} className="w-8 h-8" />
            </div>
        </div>
    );
}

const Dashboard: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    Operational Dashboard
                </h2>
                <p className="text-gray-600 text-sm">Real-time insights and analytics for your laboratory</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {kpiData.map(item => <KPICard key={item.title} {...item} />)}
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></span>
                        Weekly Revenue Trends
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }} 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Revenue" stroke="#0891b2" strokeWidth={3} activeDot={{ r: 6, fill: '#0e7490' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full"></span>
                        Average Turn-Around Time (TAT) in Hours
                    </h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tatData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }} 
                            />
                            <Legend />
                            <Bar dataKey="TAT" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
