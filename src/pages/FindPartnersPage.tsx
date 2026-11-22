import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, requestsApi } from '../services/api';
import {
  ACTIVITIES_BY_CATEGORY,
  ACTIVITY_CATEGORIES,
  ActivityCategory,
  ALL_ACTIVITIES,
  AVAILABILITY_FILTER_OPTIONS,
  PartnerRequestDTO,
  SKILL_LEVELS,
} from '../types/campus';
import { RequestCard } from '../components/RequestCard';
import { CalendarDatePicker } from '../components/CalendarDatePicker';
import {
  buildAvailabilityString,
  formatDateISOToDisplay,
  isValidTimeRange,
  parseAvailabilityString,
} from '../utils/availability';

export function FindPartnersPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [activity, setActivity] = useState<string>(searchParams.get('activity') || 'All');
  const [college, setCollege] = useState<string>(searchParams.get('college') || 'All');
  const [skillLevel, setSkillLevel] = useState<string>(searchParams.get('skillLevel') || 'All');
  const initialAvailabilityParam = searchParams.get('availability') || 'All';
  const initialCustomParsed = parseAvailabilityString(initialAvailabilityParam, '18:00', '20:00');
  const [availability, setAvailability] = useState<string>(initialAvailabilityParam);
  const [customDate, setCustomDate] = useState<string>(initialCustomParsed.date);
  const [customStartTime, setCustomStartTime] = useState<string>(initialCustomParsed.startTime);
  const [customEndTime, setCustomEndTime] = useState<string>(initialCustomParsed.endTime);
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [sort, setSort] = useState<'newest' | 'match'>(
    searchParams.get('sort') === 'match' && user ? 'match' : 'newest'
  );

  const isCustomAvailability =
    availability !== 'All' && !AVAILABILITY_FILTER_OPTIONS.includes(availability);

  const [requests, setRequests] = useState<PartnerRequestDTO[]>([]);
  const [collegeFacets, setCollegeFacets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestsApi.list({
        category,
        activity,
        college,
        skillLevel,
        availability,
        search: search.trim(),
        sort,
      });
      setRequests(res.requests);
      setCollegeFacets(res.facets.colleges);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load partner requests.');
    } finally {
      setLoading(false);
    }
  }, [category, activity, college, skillLevel, availability, search, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchRequests();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [fetchRequests]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== 'All') next.set('category', category);
    if (activity !== 'All') next.set('activity', activity);
    if (college !== 'All') next.set('college', college);
    if (skillLevel !== 'All') next.set('skillLevel', skillLevel);
    if (availability !== 'All') next.set('availability', availability);
    if (search.trim()) next.set('search', search.trim());
    if (sort !== 'newest') next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }, [category, activity, college, skillLevel, availability, search, sort, setSearchParams]);

  const availableActivities =
    category !== 'All' && (ACTIVITY_CATEGORIES as string[]).includes(category)
      ? ACTIVITIES_BY_CATEGORY[category as ActivityCategory]
      : ALL_ACTIVITIES;

  // Merge user's own college into college dropdown options cleanly without duplicates
  const collegeOptions = (() => {
    const map = new Map<string, string>();
    if (user?.college?.trim()) {
      map.set(user.college.trim().toLowerCase(), user.college.trim());
    }
    for (const c of collegeFacets) {
      const clean = c.trim();
      if (clean && !map.has(clean.toLowerCase())) {
        map.set(clean.toLowerCase(), clean);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  })();

  const isFilteringMyCollege = Boolean(
    user?.college && college.toLowerCase() === user.college.trim().toLowerCase()
  );

  const hasActiveFilters =
    category !== 'All' ||
    activity !== 'All' ||
    college !== 'All' ||
    skillLevel !== 'All' ||
    availability !== 'All' ||
    search.trim().length > 0;

  const resetFilters = () => {
    setCategory('All');
    setActivity('All');
    setCollege('All');
    setSkillLevel('All');
    setAvailability('All');
    setCustomDate('');
    setSearch('');
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Find Your People
          </h1>
          <p className="text-base text-slate-600 mt-1">
            Discover active student requests from your college or across campuses.
          </p>
        </div>
        <Link
          to={user ? '/requests/new' : '/signup'}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Request
        </Link>
      </div>

      {/* Category Tabs + Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* Category Segmented Control + Quick College Switcher + Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Filter by category"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {['All', ...ACTIVITY_CATEGORIES].map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setCategory(cat);
                      setActivity('All');
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Quick My College vs All Colleges toggle when logged in */}
            {user?.college && (
              <div
                role="group"
                aria-label="Campus scope"
                className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setCollege('All')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    college === 'All'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Colleges
                </button>
                <button
                  type="button"
                  onClick={() => setCollege(user.college)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isFilteringMyCollege
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My College ({user.college})
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, college, activity, or skills..."
                aria-label="Search partner requests by name, college, activity, or skills"
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Detailed Filter Selectors */}
        <div
          className={`${
            showFilters ? 'grid' : 'hidden lg:grid'
          } grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-100`}
        >
          <div>
            <label htmlFor="filter-college" className="block text-xs font-medium text-slate-500 mb-1">
              College
            </label>
            <select
              id="filter-college"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="All">All Colleges</option>
              {collegeOptions.map((col) => (
                <option key={col} value={col}>
                  {user?.college && col.toLowerCase() === user.college.trim().toLowerCase()
                    ? `${col} (My College)`
                    : col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-activity" className="block text-xs font-medium text-slate-500 mb-1">
              Activity
            </label>
            <select
              id="filter-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="All">All activities</option>
              {availableActivities.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-skill" className="block text-xs font-medium text-slate-500 mb-1">
              Skill Level
            </label>
            <select
              id="filter-skill"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="All">Any level</option>
              {SKILL_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-availability" className="block text-xs font-medium text-slate-500 mb-1">
              Availability
            </label>
            <select
              id="filter-availability"
              value={isCustomAvailability ? '__custom__' : availability}
              onChange={(e) => {
                const next = e.target.value;
                if (next === '__custom__') {
                  setAvailability(
                    buildAvailabilityString('time', customDate, customStartTime, customEndTime)
                  );
                } else {
                  setAvailability(next);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="All">Any time</option>
              {AVAILABILITY_FILTER_OPTIONS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
              <option value="__custom__">Pick date &amp; time…</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="block text-xs font-medium text-slate-500 mb-1">
              Sort By
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'match')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
            >
              <option value="newest">Newest requests</option>
              {user && <option value="match">Highest compatibility</option>}
            </select>
          </div>
        </div>

        {isCustomAvailability && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-600">Date &amp; time:</span>
            <div className="w-44">
              <CalendarDatePicker
                value={customDate}
                onChange={(nextDate) => {
                  setCustomDate(nextDate);
                  if (isValidTimeRange(customStartTime, customEndTime)) {
                    setAvailability(
                      buildAvailabilityString('time', nextDate, customStartTime, customEndTime)
                    );
                  } else if (nextDate) {
                    setAvailability(formatDateISOToDisplay(nextDate));
                  }
                }}
                allowClear
                compact
                placeholder="Any date"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Filter start time"
                value={customStartTime}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  setCustomStartTime(nextStart);
                  if (isValidTimeRange(nextStart, customEndTime)) {
                    setAvailability(
                      buildAvailabilityString('time', customDate, nextStart, customEndTime)
                    );
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="time"
                aria-label="Filter end time"
                value={customEndTime}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  setCustomEndTime(nextEnd);
                  if (isValidTimeRange(customStartTime, nextEnd)) {
                    setAvailability(
                      buildAvailabilityString('time', customDate, customStartTime, nextEnd)
                    );
                  }
                }}
                className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>
            {!isValidTimeRange(customStartTime, customEndTime) ? (
              <span className="text-xs text-rose-600">End time must be after start time.</span>
            ) : (
              <span className="text-xs text-slate-500">
                Matching {availability}
              </span>
            )}
          </div>
        )}

        {/* Results Meta & Reset */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span className="tabular-nums">
            {loading
              ? 'Loading requests...'
              : `${requests.length} ${requests.length === 1 ? 'request' : 'requests'} found${
                  college !== 'All' ? ` · ${college}` : ''
                }`}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 h-72" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {hasActiveFilters
              ? 'No matching requests found'
              : 'No requests yet. Be the first to find your partner!'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            {hasActiveFilters
              ? 'Try selecting All Colleges or loosening your search filters, or create your own request.'
              : 'Post what you want to learn, build, or play so other registered students can discover and connect with you.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <Link
              to={user ? '/requests/new' : '/signup'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create a Request
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}
