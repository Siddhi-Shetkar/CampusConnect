import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code2, Trophy, Palette, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestsApi } from '../services/api';
import { ACTIVITIES_BY_CATEGORY, ActivityCategory, PartnerRequestDTO } from '../types/campus';
import { Avatar } from '../components/Avatar';
import { formatRelativeDate } from '../components/RequestCard';

const HERO_IMAGE = '/src/assets/images/hero_campus_collaboration_1795262120004.jpg';
const LEARNING_IMAGE = '/src/assets/images/category_learning_1795262110256.jpg';
const SPORTS_IMAGE = '/src/assets/images/category_sports_1795262119239.jpg';

const CATEGORY_CARDS: Array<{
  key: ActivityCategory;
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
}> = [
  {
    key: 'Learning',
    title: 'Learning',
    subtitle: 'Pair up for structured practice, lab prep, and exam sprints.',
    icon: BookOpen,
  },
  {
    key: 'Building',
    title: 'Building',
    subtitle: 'Form reliable squads for hackathons, side projects, and contests.',
    icon: Code2,
  },
  {
    key: 'Sports',
    title: 'Sports',
    subtitle: 'Find consistent players for courts, turf sessions, and workouts.',
    icon: Trophy,
  },
  {
    key: 'Other',
    title: 'Other Activities',
    subtitle: 'Connect around clubs, music, photography, and campus competitions.',
    icon: Palette,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    number: '01.',
    title: 'Set up your student profile',
    description:
      'Add your college, year, skills, interests, and typical weekly availability so matches are grounded in real schedules.',
  },
  {
    number: '02.',
    title: 'Post a request or browse active listings',
    description:
      'Filter campus requests by category, activity, skill level, college, and time window—no scrolling through noisy group chats.',
  },
  {
    number: '03.',
    title: 'Send a partner request',
    description:
      'Review full requirements and compatibility details, then send a focused request with a quick note.',
  },
  {
    number: '04.',
    title: 'Accept and get started together',
    description:
      'Once accepted, both students appear in each other’s Connections list—ready to study, ship, or play.',
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const [livePreview, setLivePreview] = useState<PartnerRequestDTO[]>([]);

  useEffect(() => {
    let mounted = true;
    requestsApi
      .list({ sort: 'newest' })
      .then((res) => {
        if (mounted) setLivePreview(res.requests.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-indigo-700 mb-4">
                CampusConnect · Student Partner Discovery
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-slate-900 tracking-tight leading-[1.1] text-balance mb-6">
                Find your people. Build something together.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                Whether you&apos;re looking for a DSA partner, a hackathon teammate, a project
                collaborator, or someone to play sports with, find students who are looking for
                the same thing.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/discover"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Find a Partner
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={user ? '/dashboard' : '/signup'}
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </Link>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-900">4 Core Tracks</p>
                  <p className="text-xs text-slate-500 mt-1">Learn, build, play &amp; explore</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Schedule-Aware</p>
                  <p className="text-xs text-slate-500 mt-1">Match by level &amp; timing</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Zero Noise</p>
                  <p className="text-xs text-slate-500 mt-1">Structured requests, not spam</p>
                </div>
              </div>
            </div>

            {/* Right Visual & Product Preview Column */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/10] lg:flex-1">
                <img
                  src={HERO_IMAGE}
                  alt="College students collaborating around laptops and notebooks in a modern campus commons"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-xs font-medium text-indigo-200 mb-1">
                    Find the right person to learn, build, compete, and play with.
                  </p>
                  <p className="text-sm font-medium text-white/95">
                    Connect with real students across campuses for DSA, projects, hackathons, and
                    sports.
                  </p>
                </div>
              </div>

              {/* Live Request Preview Strip */}
              {livePreview.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700">
                      Recent campus requests
                    </span>
                    <Link
                      to="/discover"
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Browse all
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {livePreview.map((item) => (
                      <Link
                        key={item.id}
                        to={`/requests/${item.id}`}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={item.creator.name}
                            src={item.creator.profileImage}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 truncate transition-colors">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {item.creator.name} · {item.college} · {item.availability}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums shrink-0">
                          {formatRelativeDate(item.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Activity Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3 text-balance">
            Every kind of campus collaboration, organized in one place
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Pick a track to explore active student requests or post your own in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORY_CARDS.map((cat) => {
            const Icon = cat.icon;
            const activities = ACTIVITIES_BY_CATEGORY[cat.key];
            return (
              <div
                key={cat.key}
                className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Link
                      to={`/discover?category=${encodeURIComponent(cat.key)}`}
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      Explore {cat.title}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{cat.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">{cat.subtitle}</p>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 pt-5 border-t border-slate-100">
                  {activities.map((activity) => (
                    <li key={activity}>
                      <Link
                        to={`/discover?category=${encodeURIComponent(cat.key)}&activity=${encodeURIComponent(activity)}`}
                        className="text-sm text-slate-700 hover:text-indigo-700 transition-colors inline-flex items-center gap-2"
                      >
                        <span className="text-slate-300" aria-hidden="true">
                          —
                        </span>
                        {activity}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3 text-balance">
              How CampusConnect works
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              From finding a reliable study partner to filling out a hackathon team, the workflow
              stays focused and lightweight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.number} className="pt-5 border-t border-slate-200">
                <p className="font-mono text-sm font-semibold text-indigo-700 mb-3 tabular-nums">
                  {step.number}
                </p>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why CampusConnect */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4 text-balance">
              Built to replace buried WhatsApp messages and cold DMs
            </h2>
            <p className="text-base text-slate-600 leading-relaxed mb-8">
              When you ask a 400-person college group for a DSA or badminton partner, the message
              disappears in five minutes. CampusConnect keeps intent searchable, structured, and
              matched to your real schedule.
            </p>
            <ul className="space-y-4">
              {[
                'Filter by exact skill level, time window, college, and weekly frequency.',
                'Transparent rule-based compatibility calculated from real profile attributes.',
                'Review incoming requests and accept only the partners who fit your goals.',
                'Manage active, filled, and closed requests cleanly from one workspace.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-indigo-700 mt-0.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <figure className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={LEARNING_IMAGE}
                  alt="Two students practicing graph algorithms on a whiteboard in a university library"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="p-5">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Focused study &amp; project sessions
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pair with students tackling the same DSA sheets, exams, or capstone milestones.
                </p>
              </figcaption>
            </figure>

            <figure className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={SPORTS_IMAGE}
                  alt="College students playing badminton on a bright indoor campus court"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="p-5">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Consistent courts, runs &amp; clubs
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Stop cancelling matches for lack of players—match by evening or morning slots.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-slate-900 rounded-2xl px-6 py-14 sm:px-12 sm:py-16 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-balance">
              Ready to find your next study, project, or sports partner?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Create your student profile in 30 seconds and connect with peers looking for the exact
              same routine.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link
              to={user ? '/requests/new' : '/signup'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Post a Partner Request' : 'Create Free Account'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Browse Requests
            </Link>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-slate-900">CampusConnect</p>
            <p className="text-xs text-slate-500 mt-1">
              Find the right person to learn, build, compete, and play with.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <Link to="/discover" className="hover:text-slate-900 transition-colors">
              Find Partners
            </Link>
            <Link to="/signup" className="hover:text-slate-900 transition-colors">
              Sign Up
            </Link>
            <Link to="/login" className="hover:text-slate-900 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
