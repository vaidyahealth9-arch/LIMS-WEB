import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { DashboardData, DashboardWeeklyRevenueItem } from '../types';

import { getDashboardData } from '../services/api';

type KPIColor = 'cyan' | 'teal' | 'emerald' | 'sky' | 'slate' | 'amber' | 'violet';

type KPIItem = {
    title: string;
    value: string;
    icon: string;
    color: KPIColor;
    helper?: string;
};

type RevenuePoint = {
    name: string;
    Revenue: number;
};

type DashboardTimescale = 7 | 30 | 90;

const Icon: React.FC<{ name: string, className: string }> = ({ name, className }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        'user-plus': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
        link: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
        rupee: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 4h4m-8 4h8M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
        invoice: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
        beaker: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.443 2.216a2 2 0 002.164 1.773h7.14a2 2 0 002.164-1.773l.443-2.216a2 2 0 00-.547-1.806zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
        clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
        trend: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17l4-4 3 3 5-6M7 7h10v10" />,
        calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />,
    };
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{iconMap[name]}</svg>;
}

const KPICard: React.FC<KPIItem> = ({ title, value, icon, color, helper }) => {
    const colors: Record<KPIColor, string> = {
        cyan: 'from-cyan-500 to-cyan-600',
        teal: 'from-teal-500 to-teal-600',
        emerald: 'from-emerald-500 to-emerald-600',
        sky: 'from-sky-500 to-sky-600',
        slate: 'from-slate-500 to-slate-600',
        amber: 'from-amber-500 to-amber-600',
        violet: 'from-violet-500 to-violet-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex justify-between items-center border border-white/20`}>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">{title}</p>
                <p className="text-3xl font-bold mb-1">{value}</p>
                {helper && <p className="text-xs opacity-90">{helper}</p>}
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <Icon name={icon} className="w-8 h-8" />
            </div>
        </div>
    );
}

const Dashboard: React.FC = () => {
    const [selectedTimescale, setSelectedTimescale] = useState<DashboardTimescale>(7);
    const [kpiData, setKpiData] = useState<KPIItem[]>([
        { title: 'New Patients Today', value: '-', icon: 'user-plus', color: 'cyan' },
        { title: 'Revenue Today', value: '-', icon: 'rupee', color: 'emerald' },
        { title: 'Pending Service Requests', value: '-', icon: 'beaker', color: 'slate' },
        { title: 'Average TAT', value: '-', icon: 'clock', color: 'amber' },
        { title: 'Period Revenue', value: '-', icon: 'calendar', color: 'teal' },
        { title: 'Best Revenue Day', value: '-', icon: 'trend', color: 'violet' },
    ]);
    const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
    const [revenueTrendText, setRevenueTrendText] = useState('No trend available');
    const [isLoading, setIsLoading] = useState(true);

    const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
    const formatCompactCurrency = (value: number) =>
        `₹${Intl.NumberFormat('en-IN', {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(Number(value || 0))}`;

    const formatDateLabel = (dateValue: string, withDay: boolean = true) => {
        const date = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dateValue;
        return new Intl.DateTimeFormat('en-IN', {
            day: withDay ? '2-digit' : undefined,
            month: 'short',
        }).format(date);
    };

    const formatRangeLabel = (startDate: string, endDate: string) => {
        const start = formatDateLabel(startDate, true);
        const end = formatDateLabel(endDate, true);
        return `${start} - ${end}`;
    };

    const buildRevenueChartData = (dailyRevenue: DashboardWeeklyRevenueItem[], timescale: DashboardTimescale): RevenuePoint[] => {
        const normalized = dailyRevenue.map((item) => ({
            date: String(item.date),
            revenue: Number(item.revenue || 0),
        }));

        if (timescale === 7) {
            return normalized.map((item) => ({
                name: formatDateLabel(item.date, true),
                Revenue: item.revenue,
            }));
        }

        if (timescale === 30) {
            const weeklyBuckets: RevenuePoint[] = [];
            for (let i = 0; i < normalized.length; i += 7) {
                const chunk = normalized.slice(i, i + 7);
                if (chunk.length === 0) continue;
                const sum = chunk.reduce((total, item) => total + item.revenue, 0);
                weeklyBuckets.push({
                    name: formatRangeLabel(chunk[0].date, chunk[chunk.length - 1].date),
                    Revenue: sum,
                });
            }
            return weeklyBuckets;
        }

        const monthMap = new Map<string, { sum: number; date: string }>();
        normalized.forEach((item) => {
            const monthKey = item.date.substring(0, 7);
            const existing = monthMap.get(monthKey);
            if (existing) {
                existing.sum += item.revenue;
            } else {
                monthMap.set(monthKey, { sum: item.revenue, date: `${monthKey}-01` });
            }
        });

        return Array.from(monthMap.values()).map((entry) => ({
            name: formatDateLabel(entry.date, false),
            Revenue: entry.sum,
        }));
    };

    const calculateTrendText = (periodRevenue: DashboardWeeklyRevenueItem[], timescale: DashboardTimescale) => {
        if (periodRevenue.length < 2) {
            return 'Not enough data for trend';
        }

        const first = Number(periodRevenue[0]?.revenue || 0);
        const last = Number(periodRevenue[periodRevenue.length - 1]?.revenue || 0);
        if (first <= 0 && last <= 0) {
            return `No revenue movement in last ${timescale} days`;
        }

        if (first <= 0 && last > 0) {
            return 'Revenue picked up from zero baseline';
        }

        const changePercent = ((last - first) / first) * 100;
        const direction = changePercent >= 0 ? 'up' : 'down';
        return `Revenue ${direction} ${Math.abs(changePercent).toFixed(1)}% vs period start (${timescale}d)`;
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data: DashboardData = await getDashboardData(selectedTimescale);
                const totalWeeklyRevenue = data.weeklyRevenue.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
                const averageDailyRevenue = data.weeklyRevenue.length > 0 ? totalWeeklyRevenue / data.weeklyRevenue.length : 0;
                const bestDay = data.weeklyRevenue.reduce<DashboardWeeklyRevenueItem | null>((max, item) => {
                    if (!max || item.revenue > max.revenue) return item;
                    return max;
                }, null);
                const pendingToPatientsRatio = data.newPatientsToday > 0
                    ? (data.pendingServiceRequests / data.newPatientsToday).toFixed(2)
                    : data.pendingServiceRequests > 0
                        ? 'High'
                        : '0.00';
                
                setKpiData([
                    { title: 'New Patients Today', value: data.newPatientsToday.toString(), icon: 'user-plus', color: 'cyan', helper: `Avg daily rev ${formatCurrency(averageDailyRevenue)}` },
                    { title: 'Revenue Today', value: formatCurrency(data.revenueToday), icon: 'rupee', color: 'emerald', helper: `${selectedTimescale}d total ${formatCurrency(totalWeeklyRevenue)}` },
                    { title: 'Pending Service Requests', value: data.pendingServiceRequests.toString(), icon: 'beaker', color: 'slate', helper: `Pending/New ratio ${pendingToPatientsRatio}` },
                    { title: 'Average TAT', value: `${Number(data.averageTat || 0).toFixed(1)} hrs`, icon: 'clock', color: 'amber', helper: 'Sample collection to report release' },
                    { title: 'Period Revenue', value: formatCurrency(totalWeeklyRevenue), icon: 'calendar', color: 'teal', helper: `Last ${selectedTimescale} days` },
                    {
                        title: 'Best Revenue Day',
                        value: bestDay ? formatCurrency(bestDay.revenue) : formatCurrency(0),
                        icon: 'trend',
                        color: 'violet',
                        helper: bestDay ? `${formatDateLabel(String(bestDay.date), true)} peak` : 'No peak day yet'
                    },
                ]);

                const formattedRevenue = buildRevenueChartData(data.weeklyRevenue, selectedTimescale);
                setRevenueData(formattedRevenue);
                setRevenueTrendText(calculateTrendText(data.weeklyRevenue, selectedTimescale));

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedTimescale]);

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                    Operational Dashboard
                </h2>
                <p className="text-gray-600 text-sm">Real-time insights and analytics for your laboratory</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 shadow-sm">
                    <label htmlFor="dashboard-timescale" className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Timescale</label>
                    <select
                        id="dashboard-timescale"
                        value={selectedTimescale}
                        onChange={(e) => setSelectedTimescale(Number(e.target.value) as DashboardTimescale)}
                        className="rounded-md border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-sm font-medium text-cyan-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="bg-gray-200 animate-pulse p-6 rounded-xl h-[124px]"></div>
                    ))
                ) : (
                    kpiData.map(item => <KPICard key={item.title} {...item} />)
                )}
            </div>
            
            {!isLoading && (
                <div className="mb-8 rounded-xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-teal-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-cyan-700 font-semibold mb-1">Revenue Insight</p>
                    <p className="text-sm font-medium text-cyan-900">{revenueTrendText}</p>
                </div>
            )}
            
            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></span>
                        Revenue Trend ({selectedTimescale} Days)
                    </h3>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[300px] bg-gray-200 animate-pulse rounded-lg"></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    style={{ fontSize: '11px' }}
                                    interval={selectedTimescale === 7 ? 0 : 'preserveStartEnd'}
                                    minTickGap={selectedTimescale === 7 ? 8 : 18}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '11px' }}
                                    width={82}
                                    tickFormatter={formatCompactCurrency}
                                />
                                <Tooltip 
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
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
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-sky-500 rounded-full"></span>
                        Revenue Distribution ({selectedTimescale} Days)
                    </h3>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[300px] bg-gray-200 animate-pulse rounded-lg"></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    style={{ fontSize: '11px' }}
                                    interval={selectedTimescale === 7 ? 0 : 'preserveStartEnd'}
                                    minTickGap={selectedTimescale === 7 ? 8 : 18}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '11px' }}
                                    width={82}
                                    tickFormatter={formatCompactCurrency}
                                />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="Revenue" fill="#0ea5a4" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
