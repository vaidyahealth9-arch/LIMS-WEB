
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const kpiData = [
    { title: 'New Patients Today', value: '45', change: '+6%', icon: 'user-plus', color: 'blue' },
    { title: 'ABHA Linked', value: '67%', change: '+4%', icon: 'link', color: 'green' },
    { title: 'Revenue Today', value: '₹50,000', change: '+5%', icon: 'rupee', color: 'yellow' },
    { title: 'Invoices Today', value: '120', change: '', icon: 'invoice', color: 'indigo' },
    { title: 'Pending Entries', value: '8', change: '-2', icon: 'beaker', color: 'red' },
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
    const colors = {
        blue: 'from-blue-500 to-blue-400',
        green: 'from-green-500 to-green-400',
        yellow: 'from-yellow-500 to-yellow-400',
        indigo: 'from-indigo-500 to-indigo-400',
        red: 'from-red-500 to-red-400',
    };
    const changeColor = change.startsWith('+') ? 'text-green-300' : 'text-red-300';

    return (
        <div className={`bg-gradient-to-br ${colors[color]} text-white p-5 rounded-lg shadow-md flex justify-between items-center`}>
            <div>
                <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
                {change && <p className={`text-xs ${changeColor}`}>{change} vs prev period</p>}
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <Icon name={icon} className="w-7 h-7" />
            </div>
        </div>
    );
}

const Dashboard: React.FC = () => {
    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-semibold text-gray-700 mb-6">Operational Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {kpiData.map(item => <KPICard key={item.title} {...item} />)}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Weekly Revenue Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Average Turn-Around Time (TAT) in Hours</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tatData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="TAT" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
