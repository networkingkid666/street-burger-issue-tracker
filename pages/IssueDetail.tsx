import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Issue, User, UserRole, IssueStatus, IssuePriority, Comment } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Send, 
  Trash2, 
  Lightbulb,
  Loader2,
  RefreshCw,
  UserPlus,
  Edit,
  Building2,
  Tag
} from 'lucide-react';

const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [technicians, setTechnicians] = useState<User[]>([]);
  
  const [aiSolution, setAiSolution] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchIssue = useCallback(async (isRefresh = false) => {
    try {
        if (isRefresh) setRefreshing(true);
        const currentUser = await StorageService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (!user) setUser(currentUser);

        if (id) {
            const foundIssue = await StorageService.getIssueById(id);
            if (foundIssue) {
                setIssue(foundIssue);
                if (foundIssue.aiAnalysis) {
                    setAiSolution(foundIssue.aiAnalysis);
                }
            } else if (!isRefresh) {
                navigate('/dashboard');
            }
        }
    } catch (e) {
          console.error(e);
          if (!isRefresh) navigate('/dashboard');
    } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
    }
  }, [id, navigate, user]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  useEffect(() => {
    const loadTechs = async () => {
      if (user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) {
        try {
          const allUsers = await StorageService.getUsers();
          const techs = allUsers.filter(u => u.role === UserRole.TECHNICIAN);
          setTechnicians(techs);
        } catch (e) {
          console.error("Failed to load technicians", e);
        }
      }
    };
    if (user) loadTechs();
  }, [user]);

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!issue) return;
    const updated = { ...issue, status: newStatus };
    setIssue(updated); 
    await StorageService.saveIssue(updated);
  };
  
  const handleAssignTechnician = async (techId: string) => {
    if (!issue) return;
    
    if (techId === "") {
        const updated = { ...issue, assignedTo: undefined, assignedToName: undefined };
        setIssue(updated);
        await StorageService.saveIssue(updated);
        return;
    }

    const selectedTech = technicians.find(t => t.id === techId);
    if (selectedTech) {
        const updated = { ...issue, assignedTo: selectedTech.id, assignedToName: selectedTech.name };
        setIssue(updated);
        await StorageService.saveIssue(updated);
    }
  };
  
  const handleAssignToMe = async () => {
      if (!issue || !user) return;
      const updated = { ...issue, assignedTo: user.id, assignedToName: user.name };
      setIssue(updated);
      await StorageService.saveIssue(updated);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this issue?")) {
      if (issue) await StorageService.deleteIssue(issue.id);
      navigate('/issues');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !issue) return;

    const comment: Comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      content: newComment,
      timestamp: Date.now()
    };

    const updated = {
      ...issue,
      comments: [...issue.comments, comment],
    };

    setIssue(updated);
    setNewComment('');
    await StorageService.saveIssue(updated);
  };

  const handleAIAnalysis = async () => {
    if (!issue) return;
    setIsAnalyzing(true);
    const suggestion = await GeminiService.suggestSolution(issue.title, issue.description);
    setAiSolution(suggestion);
    
    const updated = { ...issue, aiAnalysis: suggestion };
    await StorageService.saveIssue(updated);
    
    setIsAnalyzing(false);
  };

  if (loading && !issue) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
      );
  }

  if (!user || !issue) return null;
  const isAdminOrTech = user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN || user.role === UserRole.MANAGER;

  return (
    <Layout user={user}>
      <div className="flex justify-between items-center mb-6">
        <button 
            onClick={() => navigate('/issues')}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Issues
        </button>
        <button
            onClick={() => fetchIssue(true)}
            disabled={refreshing}
            className="flex items-center text-slate-400 hover:text-blue-600 transition-colors"
            title="Refresh details"
        >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-slate-900">{issue.title}</h1>
              <div className="flex items-center gap-2">
                {(user.role === UserRole.ADMIN || user.id === issue.reportedBy) && (
                    <button
                        onClick={() => navigate(`/issues/edit/${issue.id}`)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Issue"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                )}
                {isAdminOrTech && (
                    <button 
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Issue"
                    >
                    <Trash2 className="w-5 h-5" />
                    </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(issue.createdAt).toLocaleString()}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {issue.location || 'Unknown Location'}
              </div>
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                {issue.place || 'Outlet'}
              </div>
              <div className="flex items-center">
                <UserIcon className="w-4 h-4 mr-2" />
                Reported by {issue.reportedByName}
              </div>
            </div>

            {issue.subCategory && (
              <div className="mb-6 flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <Tag className="w-4 h-4 mr-2" />
                {issue.category} &rsaquo; {issue.subCategory}
              </div>
            )}

            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Description</h3>
              <p className="text-slate-600 whitespace-pre-line">{issue.description}</p>
            </div>

            {issue.attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Attachments</h3>
                <div className="flex gap-4">
                  {issue.attachments.map(att => (
                    <div key={att.id} className="relative group">
                        <img 
                          src={att.data} 
                          alt={att.name} 
                          className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <a 
                             href={att.data} 
                             download={att.name}
                             className="text-white text-xs hover:underline"
                          >
                            Download
                          </a>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isAdminOrTech && (
              <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-indigo-800 font-semibold">
                    <Lightbulb className="w-5 h-5 mr-2" />
                    AI Diagnostics
                  </div>
                  {!aiSolution && (
                    <button 
                      onClick={handleAIAnalysis}
                      disabled={isAnalyzing}
                      className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-md border border-indigo-200 shadow-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Generate Solution'}
                    </button>
                  )}
                </div>
                
                {isAnalyzing && (
                  <div className="flex items-center justify-center py-4 text-indigo-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
                
                {aiSolution && (
                  <div className="text-sm text-slate-700 bg-white p-4 rounded-lg border border-indigo-100 whitespace-pre-wrap">
                    {aiSolution}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex justify-between items-center">
                Activity & Comments
            </h3>
            
            <div className="space-y-6 mb-8">
              {issue.comments.length === 0 ? (
                <p className="text-center text-slate-400 py-4">No comments yet.</p>
              ) : (
                issue.comments.map(comment => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                      {comment.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-50 p-4 rounded-lg rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm text-slate-900">{comment.userName}</span>
                          <span className="text-xs text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-sm text-slate-700">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or update..."
                className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                rows={2}
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="absolute right-3 bottom-3 text-blue-600 hover:text-blue-700 disabled:text-slate-300 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Status & Priority</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                {isAdminOrTech ? (
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Object.values(IssueStatus).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                ) : (
                   <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                     {issue.status.replace('_', ' ')}
                   </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <div className={`px-3 py-2 rounded-lg font-medium border text-center
                  ${issue.priority === IssuePriority.CRITICAL ? 'bg-red-50 text-red-600 border-red-200' : 
                    issue.priority === IssuePriority.HIGH ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-blue-50 text-blue-600 border-blue-200'}`}
                >
                  {issue.priority}
                </div>
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Main Category</label>
                <div className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                  {issue.category}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Place</label>
                <div className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                  {issue.place || 'Outlet'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Assignment</h3>
             {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? (
                 <div className="space-y-3">
                     <label className="block text-sm font-medium text-slate-700">Assign To:</label>
                     <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={issue.assignedTo || ""}
                            onChange={(e) => handleAssignTechnician(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                            <option value="">Unassigned</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>
                                    {tech.name} (Tech)
                                </option>
                            ))}
                        </select>
                     </div>
                 </div>
             ) : (
                 issue.assignedToName ? (
                   <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                     <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs mr-3">
                       {issue.assignedToName.charAt(0)}
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-blue-900">{issue.assignedToName}</p>
                       <p className="text-xs text-blue-600">Technician</p>
                     </div>
                   </div>
                 ) : (
                   <div className="text-sm text-slate-500 italic text-center py-2">
                     Unassigned
                   </div>
                 )
             )}
             {user.role === UserRole.ADMIN && issue.assignedTo !== user.id && (
                <button 
                  onClick={handleAssignToMe}
                  className="mt-4 w-full py-2 text-sm text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Assign to Me
                </button>
             )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IssueDetail;