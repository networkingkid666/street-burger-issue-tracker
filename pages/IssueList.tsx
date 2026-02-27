import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { Issue, User, UserRole, IssueStatus, IssuePriority } from '../types';
import { BRANCH_LOCATIONS, ISSUE_PLACES } from '../constants';
import { Search, Filter, Plus, ChevronRight, Loader2, UserCheck, LayoutList, AlertOctagon, RefreshCw, Calendar, Tag } from 'lucide-react';

const IssueList: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [placeFilter, setPlaceFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<'ALL' | 'ASSIGNED' | 'REPORTED'>('ALL');

  const fetchIssues = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const currentUser = await StorageService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!user) setUser(currentUser);
      
      const allIssues = await StorageService.getIssues();
      const relevantIssues = (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TECHNICIAN || currentUser.role === UserRole.MANAGER)
        ? allIssues
        : allIssues.filter(i => i.reportedBy === currentUser.id);

      setIssues(relevantIssues);
    } catch (e: any) {
      console.error("Error loading issues", e);
      setError(e.message || "Failed to load issues");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(() => fetchIssues(true), 30000); 
    return () => clearInterval(interval);
  }, [fetchIssues]);

  useEffect(() => {
    let result = issues;

    if (user) {
      if (viewFilter === 'ASSIGNED') {
        result = result.filter(i => i.assignedTo === user.id);
      } else if (viewFilter === 'REPORTED') {
        result = result.filter(i => i.reportedBy === user.id);
      }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(lower) || 
        i.description.toLowerCase().includes(lower) ||
        i.id.toLowerCase().includes(lower) ||
        i.reportedByName.toLowerCase().includes(lower) ||
        (i.subCategory && i.subCategory.toLowerCase().includes(lower))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(i => i.status === statusFilter);
    }

    if (branchFilter !== 'ALL') {
      result = result.filter(i => i.location === branchFilter);
    }

    if (placeFilter !== 'ALL') {
      result = result.filter(i => i.place === placeFilter);
    }

    if (dateFilter) {
      result = result.filter(i => {
        const d = new Date(i.createdAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const issueDate = `${year}-${month}-${day}`;
        return issueDate === dateFilter;
      });
    }

    setFilteredIssues(result);
  }, [searchTerm, statusFilter, branchFilter, placeFilter, dateFilter, viewFilter, issues, user]);

  if (loading && !user) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
     );
  }

  if (error) {
    return (
        <Layout user={user || { id: '', name: 'Guest', role: UserRole.STAFF, email: '' }}>
            <div className="p-8 text-center">
                <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                <p className="text-slate-600 bg-red-50 p-3 rounded-lg inline-block border border-red-100">{error}</p>
            </div>
        </Layout>
    );
  }

  if (!user) return null;

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN: return 'bg-red-100 text-red-800 border-red-200';
      case IssueStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-800 border-amber-200';
      case IssueStatus.RESOLVED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case IssueStatus.CLOSED: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityColor = (priority: IssuePriority) => {
    switch (priority) {
      case IssuePriority.LOW: return 'text-slate-500 bg-slate-50';
      case IssuePriority.MEDIUM: return 'text-blue-600 bg-blue-50';
      case IssuePriority.HIGH: return 'text-amber-600 bg-amber-50';
      case IssuePriority.CRITICAL: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <Layout user={user}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            Issues Board
            {refreshing && <Loader2 className="w-4 h-4 ml-2 animate-spin text-slate-400" />}
          </h1>
          <p className="text-sm text-slate-500">Manage and track IT support tickets</p>
        </div>
        <div className="flex gap-2">
            <button
            onClick={() => fetchIssues(true)}
            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
            title="Refresh List"
            >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {user.role !== UserRole.TECHNICIAN && (
              <button
              onClick={() => navigate('/create')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
              <Plus className="w-5 h-5 mr-2" />
              New Issue
              </button>
            )}
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit mb-4 overflow-x-auto max-w-full">
        <button
          onClick={() => setViewFilter('ALL')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
            viewFilter === 'ALL' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutList className="w-4 h-4 mr-2" />
          All Issues
        </button>
        {(user.role === UserRole.TECHNICIAN || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
          <button
            onClick={() => setViewFilter('ASSIGNED')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              viewFilter === 'ASSIGNED' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Assigned to Me
          </button>
        )}
        <button
          onClick={() => setViewFilter('REPORTED')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
            viewFilter === 'REPORTED' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          My Reports
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 bg-white" />
            <input
              type="text"
              placeholder="Search issues by title, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="relative flex-shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker() } catch (err) {}
                  }}
                  className="pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-sm cursor-pointer w-full sm:w-auto"
                  placeholder="Filter by Date"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-sm flex-shrink-0"
            >
              <option value="ALL">All Status</option>
              {Object.values(IssueStatus).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-sm flex-shrink-0"
            >
              <option value="ALL">All Branches</option>
              {BRANCH_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select
              value={placeFilter}
              onChange={(e) => setPlaceFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-sm flex-shrink-0"
            >
              <option value="ALL">All Places</option>
              {ISSUE_PLACES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <div className="col-span-5">Issue Details</div>
          <div className="col-span-2">Reporter</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-lg">No issues found matching your filters.</p>
              <button 
                onClick={() => {
                  setSearchTerm(''); 
                  setStatusFilter('ALL');
                  setBranchFilter('ALL');
                  setPlaceFilter('ALL');
                  setViewFilter('ALL');
                  setDateFilter('');
                }} 
                className="mt-2 text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div 
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="group md:grid md:grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer items-center relative"
              >
                <div className="col-span-5 mb-2 md:mb-0">
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-slate-400 mr-2">#{issue.id.substring(0,6)}</span>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{issue.title}</h3>
                    {issue.assignedTo === user.id && (
                        <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Assigned to you"></span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <span className="truncate">{issue.category} {issue.subCategory && `› ${issue.subCategory}`}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span>{issue.location || 'N/A'}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="whitespace-nowrap">{new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="col-span-2 text-sm text-slate-600 mb-2 md:mb-0 flex items-center">
                  <span className="md:hidden text-xs font-semibold text-slate-400 mr-2">Reporter:</span>
                  {issue.reportedByName}
                </div>

                <div className="col-span-2 mb-2 md:mb-0 flex items-center">
                   <span className="md:hidden text-xs font-semibold text-slate-400 mr-2">Priority:</span>
                   <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                     {issue.priority}
                   </span>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className="md:hidden text-xs font-semibold text-slate-400 mr-2">Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(issue.status)}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="col-span-1 hidden md:flex justify-end text-slate-400 group-hover:text-blue-600">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default IssueList;