import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { Issue, User, UserRole, IssueStatus, IssuePriority } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { FileText, Calendar, CheckCircle2, AlertCircle, Clock, Loader2, Download } from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

const MonthlyReport: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await StorageService.getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }
        setUser(currentUser);
        
        const allIssues = await StorageService.getIssues();
        const relevantIssues = (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TECHNICIAN || currentUser.role === UserRole.MANAGER)
            ? allIssues
            : allIssues.filter(i => i.reportedBy === currentUser.id);
            
        setIssues(relevantIssues);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const reportData = useMemo(() => {
    const rangeIssues = issues.filter(issue => {
        const issueDate = new Date(issue.createdAt).toISOString().split('T')[0];
        return issueDate >= startDate && issueDate <= endDate;
    });

    const total = rangeIssues.length;
    const resolved = rangeIssues.filter(i => i.status === IssueStatus.RESOLVED || i.status === IssueStatus.CLOSED).length;
    const open = rangeIssues.filter(i => i.status === IssueStatus.OPEN).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    
    const statusData = [
        { name: 'Resolved', value: resolved },
        { name: 'In Progress', value: rangeIssues.filter(i => i.status === IssueStatus.IN_PROGRESS).length },
        { name: 'Open', value: open },
        { name: 'Closed', value: rangeIssues.filter(i => i.status === IssueStatus.CLOSED).length },
    ].filter(d => d.value > 0);

    const dailyMap = new Map<string, number>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dailyMap.set(d.toISOString().split('T')[0], 0);
    }

    rangeIssues.forEach(issue => {
        const day = new Date(issue.createdAt).toISOString().split('T')[0];
        if (dailyMap.has(day)) {
            dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
        }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: date,
        count
    }));

    return {
        total,
        resolved,
        open,
        resolutionRate,
        rangeIssues,
        statusData,
        dailyData
    };
  }, [issues, startDate, endDate]);

  const handleDownloadCSV = () => {
    if (reportData.rangeIssues.length === 0) {
        alert("No data available to download for this period.");
        return;
    }

    // Professional Headers for a cleaner look
    const headers = [
        'Issue ID', 
        'Logged Date', 
        'Subject', 
        'Description', 
        'Category', 
        'Sub-Category', 
        'Area/Place', 
        'Branch Location', 
        'Priority Level', 
        'Current Status', 
        'Reported By', 
        'Assigned Technician', 
        'AI Support Notes'
    ];
    
    const csvRows = [headers.join(',')];

    /**
     * Sanitizes strings for Excel/CSV:
     * 1. Removes Markdown bold stars (**) and single stars (*)
     * 2. Replaces all line breaks with a simple space to keep rows intact
     * 3. Escapes double quotes by doubling them (Standard CSV)
     * 4. Wraps the final result in double quotes
     */
    const clean = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val)
            .replace(/\*\*/g, '')      // Strip markdown bold
            .replace(/\*/g, '')        // Strip remaining markdown stars
            .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
            .replace(/"/g, '""')       // Escape existing double quotes
            .trim();
        return `"${str}"`;
    };

    reportData.rangeIssues.forEach(issue => {
        const row = [
            clean(issue.id.substring(0, 8)), // Using shortened ID for cleaner UI
            clean(new Date(issue.createdAt).toISOString().split('T')[0]), // Date only format
            clean(issue.title),
            clean(issue.description),
            clean(issue.category),
            clean(issue.subCategory || 'N/A'),
            clean(issue.place || 'Outlet'),
            clean(issue.location || 'N/A'),
            clean(issue.priority),
            clean(issue.status.replace('_', ' ')), // Formatted status text
            clean(issue.reportedByName),
            clean(issue.assignedToName || 'Not Assigned'),
            clean(issue.aiAnalysis || 'No analysis available')
        ];
        csvRows.push(row.join(','));
    });

    // Add UTF-8 BOM (Byte Order Mark) so Excel recognizes encoding immediately
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Performance_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <Layout user={user}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Performance Report
          </h1>
          <p className="text-slate-500">Analyze metrics and export issue data</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer group hover:border-blue-400 transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 mr-2 group-hover:text-blue-500" />
                <span className="text-xs text-slate-500 mr-2 font-medium">From:</span>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker() } catch(err) {}
                    }}
                    className="outline-none text-slate-900 font-medium bg-transparent text-sm cursor-pointer"
                />
            </div>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer group hover:border-blue-400 transition-colors">
                <Calendar className="w-4 h-4 text-slate-400 mr-2 group-hover:text-blue-500" />
                <span className="text-xs text-slate-500 mr-2 font-medium">To:</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker() } catch(err) {}
                    }}
                    className="outline-none text-slate-900 font-medium bg-transparent text-sm cursor-pointer"
                />
            </div>

            <button 
                onClick={handleDownloadCSV}
                className="flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm text-sm font-medium"
            >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-up" style={{animationDelay: '100ms'}}>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-slate-500">Total Issues</p>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="w-4 h-4" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{reportData.total}</h3>
            <p className="text-xs text-slate-500 mt-1">in selected period</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-slate-500">Resolved</p>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{reportData.resolved}</h3>
            <p className="text-xs text-emerald-600 mt-1">{reportData.resolutionRate}% Resolution Rate</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-slate-500">Pending Open</p>
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <AlertCircle className="w-4 h-4" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{reportData.open}</h3>
            <p className="text-xs text-slate-500 mt-1">Currently active</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-slate-500">Critical Issues</p>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Clock className="w-4 h-4" />
                </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">
                {reportData.rangeIssues.filter(i => i.priority === IssuePriority.CRITICAL).length}
            </h3>
            <p className="text-xs text-slate-500 mt-1">High priority tickets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-up" style={{animationDelay: '150ms'}}>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Issue Volume Timeline</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10}} 
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{fill: '#f1f5f9'}}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Issues Reported" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Status Breakdown</h3>
            <div className="h-64">
                {reportData.total === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No data available for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={reportData.statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {reportData.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-up" style={{animationDelay: '200ms'}}>
         <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Issues Log</h3>
            <span className="text-xs text-slate-500">{startDate} to {endDate}</span>
         </div>
         <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Issue Title</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Place</th>
                        <th className="px-6 py-3">Priority</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Reporter</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {reportData.rangeIssues.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No issues recorded for this period.</td>
                        </tr>
                    ) : (
                        reportData.rangeIssues.sort((a,b) => b.createdAt - a.createdAt).map(issue => (
                            <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                    {new Date(issue.createdAt).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-900">{issue.title}</td>
                                <td className="px-6 py-3 text-slate-600">{issue.category}</td>
                                <td className="px-6 py-3 text-slate-600">{issue.place || 'Outlet'}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        issue.priority === IssuePriority.CRITICAL ? 'bg-red-50 text-red-700' : 
                                        issue.priority === IssuePriority.HIGH ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                    }`}>
                                        {issue.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="capitalize text-slate-700">{issue.status.toLowerCase().replace('_', ' ')}</span>
                                </td>
                                <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                    {issue.reportedByName}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>
      </div>
    </Layout>
  );
};

export default MonthlyReport;