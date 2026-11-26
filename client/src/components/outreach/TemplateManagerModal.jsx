import React, { useState } from 'react';
import {
  X,
  Plus,
  FileText,
  Edit2,
  Trash2,
  Check,
  Sparkles,
  Layers,
  Copy
} from 'lucide-react';
import { SUPPORTED_PLACEHOLDERS } from './placeholderConstants';

export const TemplateManagerModal = ({
  isOpen,
  onClose,
  templates = [],
  onCreate,
  onUpdate,
  onDelete
}) => {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setBody('');
    setDescription('');
    setError('');
  };

  const startEdit = (t) => {
    setIsCreating(false);
    setEditingTemplate(t);
    setName(t.name || '');
    setSubject(t.subject || '');
    setBody(t.body || '');
    setDescription(t.description || '');
    setError('');
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setError('');
  };

  const insertPlaceholder = (ph) => {
    setBody((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + ph + ' ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError('Template name, subject, and body are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
        description: description.trim()
      };

      if (isCreating) {
        await onCreate(payload);
      } else if (editingTemplate) {
        const tId = editingTemplate.id || editingTemplate._id;
        await onUpdate(tId, payload);
      }

      cancelEdit();
    } catch (err) {
      setError(err?.message || 'Failed to save template.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this email template?')) return;
    try {
      await onDelete(templateId);
      const currentEditingId = editingTemplate?.id || editingTemplate?._id;
      if (currentEditingId === templateId) cancelEdit();
    } catch (err) {
      setError(err?.message || 'Failed to delete template.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#15191E] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Email Templates</h3>
              <p className="text-xs text-text-muted">
                Create and manage personalized outreach templates with dynamic placeholders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body: 2-column if editing/creating, otherwise list */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Template List */}
          <div className="w-full md:w-80 border-r border-white/[0.08] p-4 flex flex-col gap-3 overflow-y-auto bg-[#101419]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Saved Templates ({templates.length})</span>
              <button
                onClick={startCreate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>No saved templates yet.</p>
                <button
                  onClick={startCreate}
                  className="mt-2 text-emerald-400 hover:underline text-xs"
                >
                  Create your first template
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => {
                  const tId = t.id || t._id;
                  const isSelected = (editingTemplate?.id || editingTemplate?._id) === tId;
                  return (
                    <div
                      key={tId}
                      onClick={() => startEdit(t)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-[#15191E] border-white/[0.06] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary truncate">{t.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tId);
                            }}
                            className="p-1 rounded text-text-muted hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted truncate mt-1">{t.subject}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Editor */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#15191E]">
            {isCreating || editingTemplate ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">
                    {isCreating ? 'Create New Template' : `Editing: ${editingTemplate.name}`}
                  </h4>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">
                      Template Name <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Guest Post Pitch - High DA"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">
                      Short Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Value-driven outreach for tech blogs"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">
                    Email Subject <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Content Collaboration for {{prospectDomain}}"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Dynamic Placeholders Helper */}
                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1.5">
                    Click to Insert Dynamic Placeholders:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => insertPlaceholder(ph)}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-purple-300 transition-colors"
                      >
                        + {ph}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">
                    Email Body (HTML / Plain text) <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={`Hi {{contactName}},\n\nI was reading {{prospectDomain}} and loved your recent insights. I wanted to propose a collaboration...\n\nBest,\n{{senderName}}`}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-text-primary focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-text-secondary hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs transition-all shadow-md shadow-purple-500/20"
                  >
                    {loading ? 'Saving...' : isCreating ? 'Create Template' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-muted p-8">
                <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] mb-3">
                  <FileText className="w-8 h-8 text-purple-400/60" />
                </div>
                <h4 className="text-sm font-semibold text-text-primary">Select or Create a Template</h4>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Click a template on the left to edit its content or click "New" to compose a reusable outreach sequence.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;
