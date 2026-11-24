import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { outreachApi } from '../../api/outreachService';
import { useToast } from '../../context/ToastContext';

export const FollowUpScheduleModal = ({
  isOpen,
  onClose,
  websiteId,
  campaignId,
  assignment,
  templates = [],
  onScheduled
}) => {
  const { showToast } = useToast();

  const [daysOffset, setDaysOffset] = useState(3);
  const [customDateTime, setCustomDateTime] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoading(false);
      setUseCustomDate(false);
      setDaysOffset(3);
      setNotes('');
      setSelectedTemplateId('');
      
      // Default custom date to 3 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      defaultDate.setHours(10, 0, 0, 0);
      setCustomDateTime(defaultDate.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  if (!isOpen || !assignment) return null;

  const prospect = assignment.prospectId && typeof assignment.prospectId === 'object'
    ? assignment.prospectId
    : assignment;

  const prospectDomain = prospect.prospectDomain || prospect.domain || 'Unknown Domain';
  const contactEmail = prospect.contactEmail || prospect.email || 'No email recorded';
  const assignmentId = assignment._id || assignment.assignmentId;
  const prospectId = prospect._id || assignment.prospectId;

  const calculateTargetDate = () => {
    if (useCustomDate && customDateTime) {
      return new Date(customDateTime);
    }
    const d = new Date();
    d.setDate(d.getDate() + Number(daysOffset));
    d.setHours(10, 0, 0, 0); // 10:00 AM
    return d;
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    const scheduledDate = calculateTargetDate();

    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setError('Please choose a valid date and time in the future.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await outreachApi.scheduleFollowUp(websiteId, campaignId, {
        prospectId,
        assignmentId,
        scheduledDate: scheduledDate.toISOString(),
        notes: notes.trim(),
        templateId: selectedTemplateId || null
      });

      showToast(`Follow-up scheduled for ${prospectDomain} on ${scheduledDate.toLocaleDateString()}`);
      if (onScheduled) onScheduled();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#15191E] border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Schedule Follow-up</h3>
              <p className="text-xs text-slate-400">Automate follow-up reminder for outreach</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSchedule} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Prospect Summary */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Prospect:</span>
              <span className="font-semibold text-slate-200">{prospectDomain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recipient Email:</span>
              <span className="text-slate-300">{contactEmail}</span>
            </div>
          </div>

          {/* Timing presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Follow-up Timing
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'In 3 Days', val: 3 },
                { label: 'In 5 Days', val: 5 },
                { label: 'In 1 Week', val: 7 },
                { label: 'In 2 Weeks', val: 14 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setDaysOffset(opt.val);
                    setUseCustomDate(false);
                  }}
                  className={`py-2 px-3 text-xs rounded-lg font-medium transition-colors border ${
                    !useCustomDate && daysOffset === opt.val
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="customFollowUp"
                checked={useCustomDate}
                onChange={(e) => setUseCustomDate(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
              />
              <label htmlFor="customFollowUp" className="text-xs text-slate-300 cursor-pointer">
                Pick specific date and time
              </label>
            </div>

            {useCustomDate && (
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Optional Template */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Select Follow-up Template (Optional)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- No specific template (Custom follow-up) --</option>
                {templates.map((tpl) => (
                  <option key={tpl._id} value={tpl._id}>
                    {tpl.name} ({tpl.subject})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Internal Notes / Reminder
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Check if editor replied on LinkedIn, pitch alternate anchor text..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Scheduling...</span>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Schedule Follow-up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FollowUpScheduleModal;