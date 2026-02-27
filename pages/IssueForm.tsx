import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { User, UserRole, IssueStatus, IssuePriority } from '../types';
import { CATEGORIES, CATEGORY_STRUCTURE, BRANCH_LOCATIONS, ISSUE_PLACES } from '../constants';
import { Wand2, Loader2, Upload, X, AlertCircle, CheckCircle2, Circle } from 'lucide-react';

const IssueForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); 
  const isEditing = !!id;

  const [user, setUser] = useState<User | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState('');
  
  // Validation State
  const [showErrors, setShowErrors] = useState(false);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [attachment, setAttachment] = useState<{name: string, data: string} | null>(null);

  useEffect(() => {
    const init = async () => {
        const currentUser = await StorageService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (currentUser.role === UserRole.TECHNICIAN && !isEditing) {
          navigate('/dashboard');
          return;
        }
        setUser(currentUser);

        if (id) {
          setLoadingIssue(true);
          try {
            const issue = await StorageService.getIssueById(id);
            if (issue) {
              if (currentUser.role !== UserRole.ADMIN && issue.reportedBy !== currentUser.id) {
                alert("You do not have permission to edit this issue.");
                navigate('/dashboard');
                return;
              }

              setTitle(issue.title);
              setDescription(issue.description);
              setCategory(issue.category);
              setSubCategory(issue.subCategory || '');
              setPriority(issue.priority);
              if (issue.location) setLocation(issue.location);
              if (issue.place) setPlace(issue.place);
            } else {
              navigate('/issues');
            }
          } catch (error) {
            console.error("Failed to load issue", error);
            navigate('/issues');
          } finally {
            setLoadingIssue(false);
          }
        }
    };
    init();
  }, [navigate, id, isEditing]);

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setSubCategory(''); 
  };

  const handleAIAutoFill = async () => {
    if (!title) return;
    setIsGenerating(true);
    const generatedDesc = await GeminiService.expandIssueDescription(title, category || 'General');
    setDescription(generatedDesc);
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1048576) { 
        alert("File is too large. Please use a smaller image (under 1MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = title.trim() !== '' && 
                      description.trim() !== '' && 
                      category !== '' && 
                      subCategory !== '' &&
                      location !== '' && 
                      place !== '' && 
                      priority !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    if (!isFormValid) {
        return;
    }

    if (!user) return;
    setIsSubmitting(true);

    try {
        const issuePayload: any = {
            title,
            description,
            category,
            subCategory,
            priority: priority as IssuePriority,
            location: location,
            place: place,
        };

        if (isEditing) {
          issuePayload.id = id;
          if (attachment) {
            issuePayload.attachments = [{
                id: crypto.randomUUID(),
                name: attachment.name,
                type: 'image',
                data: attachment.data
            }];
          }
        } else {
          issuePayload.status = IssueStatus.OPEN;
          issuePayload.reportedBy = user.id;
          issuePayload.reportedByName = user.name;
          issuePayload.comments = [];
          issuePayload.attachments = attachment ? [{
              id: crypto.randomUUID(),
              name: attachment.name,
              type: 'image',
              data: attachment.data
          }] : [];
        }

        await StorageService.saveIssue(issuePayload);
        
        if (isEditing) {
          navigate(`/issues/${id}`);
        } else {
          navigate('/issues');
        }
    } catch (error) {
        console.error("Failed to submit issue", error);
        alert("Failed to submit issue. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!user || loadingIssue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const LabelWithError = ({ label, isError }: { label: string, isError: boolean }) => (
    <div className="flex justify-between items-center mb-1.5">
      <label className={`block text-[13px] font-semibold ${isError ? 'text-red-600' : 'text-slate-600'}`}>{label}</label>
      {isError && (
        <span className="text-[10px] font-black text-red-600 uppercase flex items-center bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
          <AlertCircle className="w-2.5 h-2.5 mr-1" />
          Required
        </span>
      )}
    </div>
  );

  const subCategories = category ? CATEGORY_STRUCTURE[category] : [];

  return (
    <Layout user={user}>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Issue' : 'Report New Issue'}
            </h1>
            <p className="text-slate-500 mt-1">Please provide accurate details to help our technical team assist you faster.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8 transition-all hover:shadow-md">
            
            {/* 1. Title */}
            <div className="space-y-2">
                <LabelWithError label="Issue Title" isError={showErrors && !title.trim()} />
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the problem"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-4 outline-none bg-white text-slate-900 transition-all font-medium
                    ${showErrors && !title.trim() ? 'border-red-300 ring-red-50 focus:ring-red-100' : 'border-slate-200 ring-blue-50 focus:ring-blue-100 focus:border-blue-500'}`}
                />
            </div>

            {/* 2. Main Category Selection */}
            <div>
                <LabelWithError label="Main Category" isError={showErrors && !category} />
                <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-4 outline-none bg-white text-slate-900 transition-all cursor-pointer
                    ${showErrors && !category ? 'border-red-300 ring-red-50' : 'border-slate-200 ring-blue-50 focus:border-blue-500'}`}
                >
                    <option value="">-- Select Category --</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* 3. Sub-Category Grid (Conditioned on Category, placed ABOVE Location as requested) */}
            {category && (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-fade-in shadow-inner">
                 <LabelWithError label={`Select specific ${category} issue (Sub-category)`} isError={showErrors && !subCategory} />
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {subCategories.map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubCategory(sub)}
                        className={`group flex items-center text-left px-4 py-4 rounded-xl border transition-all duration-200
                          ${subCategory === sub 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors
                          ${subCategory === sub 
                            ? 'bg-white border-white text-blue-600' 
                            : 'bg-slate-50 border-slate-200 group-hover:border-blue-200'}
                        `}>
                          {subCategory === sub ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3 text-slate-300" />}
                        </div>
                        <span className="text-sm font-bold leading-tight">{sub}</span>
                      </button>
                    ))}
                 </div>
              </div>
            )}

            {/* 4. Location & Place Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <LabelWithError label="Location (Branch)" isError={showErrors && !location} />
                    <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-4 outline-none bg-white text-slate-900 transition-all cursor-pointer
                        ${showErrors && !location ? 'border-red-300 ring-red-50' : 'border-slate-200 ring-blue-50 focus:border-blue-500'}`}
                    >
                        <option value="">-- Select Location --</option>
                        {BRANCH_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <LabelWithError label="Place" isError={showErrors && !place} />
                    <select
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-4 outline-none bg-white text-slate-900 transition-all cursor-pointer
                        ${showErrors && !place ? 'border-red-300 ring-red-50' : 'border-slate-200 ring-blue-50 focus:border-blue-500'}`}
                    >
                        <option value="">-- Select Place --</option>
                        {ISSUE_PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* 5. Priority Selection */}
            <div>
                <LabelWithError label="Priority Level" isError={showErrors && !priority} />
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-4 outline-none bg-white text-slate-900 transition-all cursor-pointer font-bold
                    ${showErrors && !priority ? 'border-red-300 ring-red-50' : 'border-slate-200 ring-blue-50 focus:border-blue-500'}`}
                >
                    <option value="">-- Select Priority --</option>
                    {Object.values(IssuePriority).map(p => (
                        <option key={p} value={p} className={p === 'CRITICAL' ? 'text-red-600 font-bold' : ''}>
                            {p}
                        </option>
                    ))}
                </select>
            </div>

            {/* 6. Description */}
            <div className="relative group">
                <LabelWithError label="Detailed Description" isError={showErrors && !description.trim()} />
                <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide more context here. What happened? Any error codes? When did it start?"
                    className={`w-full px-4 py-4 border rounded-xl focus:ring-4 outline-none resize-none bg-white text-slate-900 transition-all
                        ${showErrors && !description.trim() ? 'border-red-300 ring-red-50' : 'border-slate-200 ring-blue-50 focus:border-blue-500'}`}
                />
                <button
                    type="button"
                    onClick={handleAIAutoFill}
                    disabled={isGenerating || !title}
                    className={`absolute bottom-4 right-4 flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all
                        ${isGenerating 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 active:scale-95'
                        }`}
                >
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                    {isGenerating ? 'AI Generating...' : 'AI Smart-Fill'}
                </button>
            </div>

            {/* 7. Attachment */}
            <div>
                <label className="block text-[13px] font-semibold text-slate-600 mb-2">
                    {isEditing ? 'New Attachment (Overrides existing)' : 'Add Photo/Screenshot'}
                </label>
                {!attachment ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer relative bg-slate-50/50">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                        <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Click to upload (Max 1MB)</span>
                    <span className="text-xs text-slate-400 mt-1">Supports JPG, PNG</span>
                </div>
                ) : (
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 border border-emerald-200">
                            <img src={attachment.data} className="w-full h-full object-cover" alt="preview" />
                        </div>
                        <span className="text-sm text-emerald-800 font-bold truncate max-w-xs">{attachment.name}</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setAttachment(null)}
                        className="text-emerald-600 hover:text-red-500 p-2 transition-colors bg-white rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/issues/${id}` : '/issues')}
              className="px-8 py-3 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (showErrors && !isFormValid)}
              className={`px-10 py-3 text-white rounded-xl font-black shadow-lg transition-all flex items-center justify-center min-w-[180px]
                ${!isFormValid && showErrors 
                  ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 active:scale-95'
                }`}
            >
              {isSubmitting ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                    Saving...
                </>
              ) : (
                isEditing ? 'Update Issue' : 'Submit Issue'
              )}
            </button>
          </div>

        </form>
      </div>
    </Layout>
  );
};

export default IssueForm;