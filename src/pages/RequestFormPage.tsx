import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, requestsApi } from '../services/api';
import {
  ACTIVITIES_BY_CATEGORY,
  ACTIVITY_CATEGORIES,
  ActivityCategory,
  REQUEST_FREQUENCIES,
  RequestFrequency,
  SKILL_LEVELS,
  SkillLevel,
} from '../types/campus';
import { AvailabilityTimePicker } from '../components/AvailabilityTimePicker';
import {
  buildAvailabilityString,
  getTodayISO,
  isValidTimeRange,
  parseAvailabilityString,
} from '../utils/availability';

export function RequestFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const defaultAvailability = (() => {
    const parsed = parseAvailabilityString(user?.availability || '', '19:00', '21:00');
    if (parsed.mode === 'flexible') return 'Flexible';
    return buildAvailabilityString(
      'time',
      parsed.date || getTodayISO(),
      parsed.startTime,
      parsed.endTime
    );
  })();

  const [form, setForm] = useState({
    title: '',
    category: 'Learning' as ActivityCategory,
    activity: 'DSA Partner',
    description: '',
    skillLevel: 'Intermediate' as SkillLevel,
    availability: defaultAvailability,
    frequency: 'Few times a week' as RequestFrequency,
    college: user?.college || '',
    peopleNeeded: 1,
  });

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing || !id) return;
    let active = true;
    requestsApi
      .getById(id)
      .then((res) => {
        if (!active) return;
        const r = res.request;
        if (user && r.creator.id !== user.id) {
          showToast('You can only edit your own requests.', 'error');
          navigate('/my-requests', { replace: true });
          return;
        }
        setForm({
          title: r.title,
          category: r.category,
          activity: r.activity,
          description: r.description,
          skillLevel: r.skillLevel,
          availability: r.availability,
          frequency: r.frequency,
          college: r.college,
          peopleNeeded: r.peopleNeeded,
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load request.');
      })
      .finally(() => {
        if (active) setLoadingExisting(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEditing, user, navigate, showToast]);

  const suggestedActivities = ACTIVITIES_BY_CATEGORY[form.category];

  const handleCategoryChange = (nextCategory: ActivityCategory) => {
    const nextSuggested = ACTIVITIES_BY_CATEGORY[nextCategory];
    setForm((prev) => ({
      ...prev,
      category: nextCategory,
      activity: nextSuggested[0] || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.title.trim().length < 4) {
      setError('Please enter a clear title (at least 4 characters).');
      return;
    }
    if (form.activity.trim().length < 2) {
      setError('Please specify an activity.');
      return;
    }
    if (form.description.trim().length < 10) {
      setError('Please add a brief description (at least 10 characters) of what you are looking for.');
      return;
    }
    if (form.availability.trim().length < 2) {
      setError('Please select a date and time, or choose Flexible.');
      return;
    }
    const parsedAvail = parseAvailabilityString(form.availability);
    if (parsedAvail.mode === 'time') {
      if (!parsedAvail.date) {
        setError('Please select a date from the calendar for your partner request.');
        return;
      }
      if (!isValidTimeRange(parsedAvail.startTime, parsedAvail.endTime)) {
        setError('Please choose an availability end time that is later than the start time.');
        return;
      }
    }
    if (form.college.trim().length < 2) {
      setError('Please specify your college.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        activity: form.activity.trim(),
        description: form.description.trim(),
        skillLevel: form.skillLevel,
        availability: form.availability.trim(),
        frequency: form.frequency,
        college: form.college.trim(),
        peopleNeeded: Number(form.peopleNeeded) || 1,
      };

      if (isEditing && id) {
        await requestsApi.update(id, payload);
        showToast('Partner request updated.', 'success');
        navigate('/my-requests');
      } else {
        const res = await requestsApi.create(payload);
        showToast('Partner request published! Other students can now discover it.', 'success');
        navigate(`/requests/${res.request.id}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to save request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-4">
        <div className="h-8 w-56 bg-slate-200 rounded-lg" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          to={isEditing ? '/my-requests' : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEditing ? 'Back to My Requests' : 'Back to Dashboard'}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {isEditing ? 'Edit Partner Request' : 'Create a Partner Request'}
        </h1>
        <p className="text-base text-slate-600 mt-1">
          Share what you want to work on or play, along with your level and availability.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
        noValidate
      >
        {/* Title */}
        <div>
          <label htmlFor="req-title" className="block text-sm font-medium text-slate-800 mb-1.5">
            Request Title
          </label>
          <input
            id="req-title"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Looking for a DSA partner for Graphs, Trees & DP"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Category segmented selector */}
        <div>
          <span className="block text-sm font-medium text-slate-800 mb-2">Category</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-100 rounded-lg">
            {ACTIVITY_CATEGORIES.map((cat) => {
              const selected = form.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    selected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity */}
        <div>
          <label htmlFor="req-activity" className="block text-sm font-medium text-slate-800 mb-1.5">
            Activity
          </label>
          <input
            id="req-activity"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. DSA Partner, Hackathon Teammate, Badminton"
            value={form.activity}
            onChange={(e) => setForm((prev) => ({ ...prev, activity: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {suggestedActivities.map((act) => {
              const active = form.activity.toLowerCase() === act.toLowerCase();
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, activity: act }))}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    active
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {act}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="req-desc" className="block text-sm font-medium text-slate-800 mb-1.5">
            Description &amp; Goals
          </label>
          <textarea
            id="req-desc"
            rows={4}
            required
            maxLength={1200}
            placeholder="Describe what you want to practice, build, or play, your routine, and what makes a good partner..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-y"
          />
        </div>

        {/* Skill Level & Frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="req-skill" className="block text-sm font-medium text-slate-800 mb-1.5">
              Skill Level
            </label>
            <select
              id="req-skill"
              value={form.skillLevel}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, skillLevel: e.target.value as SkillLevel }))
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              {SKILL_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="req-freq" className="block text-sm font-medium text-slate-800 mb-1.5">
              Frequency
            </label>
            <select
              id="req-freq"
              value={form.frequency}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, frequency: e.target.value as RequestFrequency }))
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              {REQUEST_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Availability Date & Time */}
        <AvailabilityTimePicker
          idPrefix="req-avail"
          label="When do you want a partner?"
          value={form.availability}
          onChange={(next) => setForm((prev) => ({ ...prev, availability: next }))}
          requireDate
          helperText="Pick a date from the calendar and your preferred start/end time so partners can match your schedule."
        />

        {/* College & People Needed */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="req-college" className="block text-sm font-medium text-slate-800 mb-1.5">
              College / Campus
            </label>
            <input
              id="req-college"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. CBIT"
              value={form.college}
              onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="req-people" className="block text-sm font-medium text-slate-800 mb-1.5">
              People Needed
            </label>
            <input
              id="req-people"
              type="number"
              min={1}
              max={12}
              required
              value={form.peopleNeeded}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  peopleNeeded: Math.max(1, Math.min(12, Number(e.target.value) || 1)),
                }))
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            to={isEditing ? '/my-requests' : '/discover'}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? isEditing
                ? 'Saving changes...'
                : 'Creating request...'
              : isEditing
              ? 'Save Changes'
              : 'Create Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
