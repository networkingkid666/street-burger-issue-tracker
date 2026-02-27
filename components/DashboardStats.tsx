import React from 'react';
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
import { Issue, IssueStatus, IssuePriority } from '../types';

interface DashboardStatsProps {
  issues: Issue[];
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#64748b'];
const PRIORITY_COLORS = {
  [IssuePriority.LOW]: '#10b981',
  [IssuePriority.MEDIUM]: '#3b82f6',
  [IssuePriority.HIGH]: '#f59e0b',
  [IssuePriority.CRITICAL]: '#ef4444'
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ issues }) => {
  // Process Data for Charts
  const statusData = [
    { name: 'Open', value: issues.filter(i => i.status === IssueStatus.OPEN).length },
    { name: 'In Progress', value: issues.filter(i => i.status === IssueStatus.IN_PROGRESS).length },
    { name: 'Resolved', value: issues.filter(i => i.status === IssueStatus.RESOLVED).length },
    { name: 'Closed', value: issues.filter(i => i.status === IssueStatus.CLOSED).length },
  ];

  const priorityData = Object.values(IssuePriority).map(priority => ({
    name: priority,
    value: issues.filter(i => i.priority === priority).length
  }));

  const StatCard = ({ title, value, color, icon }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Issues" 
          value={issues.length} 
          color="bg-blue-50 text-blue-600"
          icon={<div className="w-6 h-6 font-bold flex items-center justify-center">#</div>}
        />
        <StatCard 
          title="Open Pending" 
          value={statusData[0].value} 
          color="bg-red-50 text-red-600"
          icon={<div className="w-6 h-6 rounded-full bg-red-500" />}
        />
        <StatCard 
          title="In Progress" 
          value={statusData[1].value} 
          color="bg-amber-50 text-amber-600"
          icon={<div className="w-6 h-6 rounded-full bg-amber-500" />}
        />
        <StatCard 
          title="Resolved" 
          value={statusData[2].value} 
          color="bg-emerald-50 text-emerald-600"
          icon={<div className="w-6 h-6 rounded-full bg-emerald-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Issues by Status</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Issues by Priority</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as IssuePriority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;