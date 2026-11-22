import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, usersApi } from '../services/api';
import {
  ALL_ACTIVITIES,
  SKILL_LEVELS,
  SkillLevel,
  YEARS_OF_STUDY,
} from '../types/campus';
import { Avatar } from '../components/Avatar';
import { AvailabilityTimePicker } from '../components/AvailabilityTimePicker';
import { isValidTimeRange, parseAvailabilityString } from '../utils/availability';

const AVATAR_PRESETS = [
  { label: 'Initials', url: '' },
  { label: 'Portrait A', url: '/src/assets/images/avatar_student_one_1795262112146.jpg' },
  { label: 'Portrait B', url: '/src/assets/images/avatar_student_two_1795262113573.jpg' },
];

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    college: user?.college || '',
    year: user?.year || '2nd Year',
    bio: user?.bio || '',
    profileImage: user?.profileImage || '',
    skills: user?.skills || [],
    interests: user?.interests || [],
    preferredActivities: user?.preferredActivities || [],
    availability: user?.availability || '',
    skillLevel: (user?.skillLevel || 'Intermediate') as SkillLevel,
  });

  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addListItem = (field: 'skills' | 'interests', rawValue: string, clearFn: () => void) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setForm((prev) => {
      if (prev[field].some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return { ...prev, [field]: [...prev[field], trimmed].slice(0, 15) };
    });
    clearFn();
  };

  const removeListItem = (field: 'skills' | 'interests', itemToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== itemToRemove),
    }));
  };

  const togglePreferredActivity = (activity: string) => {
    setForm((prev) => {
      const exists = prev.preferredActivities.includes(activity);
      return {
        ...prev,
        preferredActivities: exists
          ? prev.preferredActivities.filter((a) => a !== activity)
          : [...prev.preferredActivities, activity].slice(0, 12),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (form.college.trim().length < 2) {
      setError('Please enter your college name.');
      return;
    }
    if (form.availability.trim()) {
      const parsedAvail = parseAvailabilityString(form.availability);
      if (parsedAvail.mode === 'time' && !isValidTimeRange(parsedAvail.startTime, parsedAvail.endTime)) {
        setError('Please choose an availability end time that is later than the start time.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await usersApi.updateMe({
        name: form.name.trim(),
        college: form.college.trim(),
        year: form.year,
        bio: form.bio.trim(),
        profileImage: form.profileImage.trim(),
        skills: form.skills,
        interests: form.interests,
        preferredActivities: form.preferredActivities,
        availability: form.availability.trim(),
        skillLevel: form.skillLevel,
      });
      setUser(res.user);
      showToast('Profile saved! Compatibility scores will reflect your updates.', 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Profile</h1>
        <p className="text-base text-slate-600 mt-1">
          Keep your skills, preferred activities, and availability up to date for better partner
          matches.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Live Profile Preview Card */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={form.name || 'Student'} src={form.profileImage} size="xl" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {form.name || 'Your Name'}
              </h2>
              <p className="text-sm text-slate-600 truncate">
                {form.college || 'College'} · {form.year}
              </p>
              {user?.email && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {form.bio || 'Add a short bio so peers know what you enjoy learning, building, or playing.'}
          </p>

          <dl className="space-y-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Skill Level</dt>
              <dd className="text-slate-900 font-medium mt-0.5">{form.skillLevel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Availability</dt>
              <dd className="text-slate-900 font-medium mt-0.5">
                {form.availability || 'Not set yet'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Skills</dt>
              <dd className="text-slate-800 mt-0.5">
                {form.skills.length > 0 ? form.skills.join(' · ') : 'None added yet'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Interests</dt>
              <dd className="text-slate-800 mt-0.5">
                {form.interests.length > 0 ? form.interests.join(' · ') : 'None added yet'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Preferred Activities</dt>
              <dd className="text-slate-800 mt-0.5">
                {form.preferredActivities.length > 0
                  ? form.preferredActivities.join(' · ')
                  : 'None selected yet'}
              </dd>
            </div>
          </dl>
        </aside>

        {/* Edit Profile Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
          noValidate
        >
          {error && (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"
            >
              {error}
            </div>
          )}

          {/* Profile Picture */}
          <div>
            <label
              htmlFor="profile-img"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Profile Picture
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {AVATAR_PRESETS.map((preset) => {
                const selected = form.profileImage === preset.url;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, profileImage: preset.url }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <input
              id="profile-img"
              type="url"
              placeholder="Or paste an HTTPS image URL"
              value={form.profileImage}
              onChange={(e) => setForm((prev) => ({ ...prev, profileImage: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-sm font-medium text-slate-800 mb-1.5">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label htmlFor="prof-college" className="block text-sm font-medium text-slate-800 mb-1.5">
                College
              </label>
              <input
                id="prof-college"
                type="text"
                required
                value={form.college}
                onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-year" className="block text-sm font-medium text-slate-800 mb-1.5">
                Year of Study
              </label>
              <select
                id="prof-year"
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              >
                {YEARS_OF_STUDY.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prof-level" className="block text-sm font-medium text-slate-800 mb-1.5">
                Overall Skill Level
              </label>
              <select
                id="prof-level"
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
          </div>

          {/* Short Bio */}
          <div>
            <label htmlFor="prof-bio" className="block text-sm font-medium text-slate-800 mb-1.5">
              Short Bio
            </label>
            <textarea
              id="prof-bio"
              rows={3}
              maxLength={400}
              placeholder="Tell other students what you're studying, building, or playing this semester..."
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Availability */}
          <AvailabilityTimePicker
            idPrefix="prof-avail"
            label="Typical Availability (Date & Time)"
            value={form.availability}
            onChange={(next) => setForm((prev) => ({ ...prev, availability: next }))}
            allowEmpty
            helperText="Pick an upcoming date (optional) and preferred time window to improve schedule matches."
          />

          {/* Skills */}
          <div>
            <label htmlFor="prof-skills" className="block text-sm font-medium text-slate-800 mb-1.5">
              Skills
            </label>
            <div className="flex gap-2">
              <input
                id="prof-skills"
                type="text"
                placeholder="e.g. React, C++, DSA, Figma"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addListItem('skills', skillInput, () => setSkillInput(''));
                  }
                }}
                className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => addListItem('skills', skillInput, () => setSkillInput(''))}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {form.skills.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removeListItem('skills', item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                  >
                    {item}
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interests */}
          <div>
            <label
              htmlFor="prof-interests"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Interests
            </label>
            <div className="flex gap-2">
              <input
                id="prof-interests"
                type="text"
                placeholder="e.g. Hackathons, Badminton, Machine Learning"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addListItem('interests', interestInput, () => setInterestInput(''));
                  }
                }}
                className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => addListItem('interests', interestInput, () => setInterestInput(''))}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {form.interests.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {form.interests.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removeListItem('interests', item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                  >
                    {item}
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preferred Activities */}
          <div>
            <span className="block text-sm font-medium text-slate-800 mb-2">
              Preferred Activities
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_ACTIVITIES.map((act) => {
                const selected = form.preferredActivities.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => togglePreferredActivity(act)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-indigo-700 border-indigo-700 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving profile...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
