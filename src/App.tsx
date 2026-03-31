/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocFromServer 
} from "firebase/firestore";
import { 
  Briefcase, 
  PenTool, 
  PlusCircle, 
  Trash2, 
  Undo2, 
  ExternalLink, 
  LogOut, 
  LogIn, 
  Crown, 
  PlayCircle, 
  Youtube, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Lock, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./firebase";

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

interface PortalSettings {
  requirements: string[];
  formUrl: string;
  ownerEmail?: string;
}

// --- Constants ---

const ADMIN_EMAIL = "likhithbellamkonda@gmail.com";

const DEFAULT_REQUIREMENTS = [
  "Currently enrolled in Bachelor's / Master's (any discipline)",
  "Strong analytical & problem-solving mindset",
  "Available for minimum 3 months (remote/hybrid)",
  "Proficiency in MS Office & collaboration tools",
  "Self-starter with curiosity and growth attitude",
  "Prior project or internship experience (preferred)"
];

const DEFAULT_FORM_URL = "https://forms.gle/ET9VQorz97VrZESW9";

const VIDEOS = [
  { id: "qVtT2GcYQxE", title: "How Purpose Finds You", desc: "Nitin Dua shares deep insights on discovering life purpose." },
  { id: "uVnJxZzqPds", title: "Inner Growth & Living Intentionally", desc: "Key lessons on becoming your best version." },
  { id: "l3y5L5Y5JWs", title: "The Essence of Life", desc: "Finding deeper meaning and staying aligned." },
  { id: "BJy7H8nKqM2", title: "What Makes You Come Alive?", desc: "Conversation about purpose and inner drive." },
  { id: "d8VXgL5kP9A", title: "Overcoming Career Challenges", desc: "Practical advice for professionals." }
];

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const parsed = JSON.parse(event.error.message);
        if (parsed.error && parsed.authInfo) {
          setHasError(true);
          setErrorInfo(event.error.message);
        }
      } catch {
        // Not a FirestoreErrorInfo JSON
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={32} />
            <h2 className="text-xl font-bold">System Error</h2>
          </div>
          <p className="text-gray-600 mb-6">
            A critical error occurred while communicating with the database.
          </p>
          <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-40 mb-6 text-gray-500">
            {errorInfo}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const VideoModal: React.FC<{ videoId: string; onClose: () => void }> = ({ videoId, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe 
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
          title="YouTube video player"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <LogOut size={24} className="rotate-90" />
        </button>
      </motion.div>
    </motion.div>
  );
};

const VideoCard: React.FC<{ video: typeof VIDEOS[0]; onSelect: (id: string) => void }> = ({ video, onSelect }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setIsPreviewing(true);
    }, 1500); // 1.5 seconds delay
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsPreviewing(false);
  };

  return (
    <div className="min-w-[320px] md:min-w-[400px] snap-center">
      <div 
        className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onSelect(video.id)}
      >
        <div className="aspect-video relative bg-slate-900 overflow-hidden">
          {isPreviewing ? (
            <iframe 
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&modestbranding=1&rel=0&controls=0&start=0&end=15`}
              title={video.title}
              className="absolute inset-0 w-full h-full border-0 scale-110"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <img 
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`} 
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          )}
          
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-red-600 shadow-xl transform transition-transform group-hover:scale-110">
              <PlayCircle size={32} fill="currentColor" className="text-red-600" />
            </div>
          </div>

          {isPreviewing && (
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Previewing
            </div>
          )}
        </div>
        <div className="p-6">
          <h3 className="font-bold text-lg mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">{video.title}</h3>
          <p className="text-sm text-slate-500 line-clamp-2">{video.desc}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [newReq, setNewReq] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Auth ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      showToast("Login failed. Please try again.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // --- Data Fetching ---

  useEffect(() => {
    if (!isAuthReady) return;

    const path = "internship_settings/global";
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as PortalSettings);
      } else {
        // Initialize with defaults if not exists (only admin can write, but we need to show defaults)
        setSettings({
          requirements: DEFAULT_REQUIREMENTS,
          formUrl: DEFAULT_FORM_URL,
          ownerEmail: ADMIN_EMAIL
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // --- Connection Test ---

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // --- Actions ---

  const saveSettings = async (updatedSettings: PortalSettings) => {
    if (!isAdmin) return;
    setIsSaving(true);
    const path = "internship_settings/global";
    try {
      await setDoc(doc(db, path), updatedSettings);
      showToast("Settings updated successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const addRequirement = () => {
    if (!newReq.trim() || !settings) return;
    const updated = { ...settings, requirements: [...settings.requirements, newReq.trim()] };
    saveSettings(updated);
    setNewReq("");
  };

  const removeRequirement = (index: number) => {
    if (!settings) return;
    const updated = { ...settings, requirements: settings.requirements.filter((_, i) => i !== index) };
    saveSettings(updated);
  };

  const resetDefaults = () => {
    if (!settings) return;
    saveSettings({
      ...settings,
      requirements: DEFAULT_REQUIREMENTS,
      formUrl: DEFAULT_FORM_URL
    });
  };

  const updateFormUrl = (url: string) => {
    if (!settings) return;
    saveSettings({ ...settings, formUrl: url });
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  // --- Render ---

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans selection:bg-blue-100">
        {/* Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Briefcase size={22} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">Internship Nexus</span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3 bg-slate-50 p-1 pr-3 rounded-full border border-slate-200">
                  <img src={user.photoURL || ""} alt="avatar" className="w-8 h-8 rounded-full border border-white shadow-sm" />
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-slate-700 leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 leading-none mt-0.5">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Crown size={10} /> Admin
                    </div>
                  )}
                  <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                >
                  <LogIn size={18} /> Sign In
                </button>
              )}
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6"
            >
              Ignite Your Career with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Elite Internships
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-500 max-w-2xl mx-auto"
            >
              Curated opportunities, real-world experience, and professional growth. 
              Find your next big break here.
            </motion.p>
          </section>

          {/* Requirements Section */}
          <section className="mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <PenTool size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Core Requirements</h2>
                    <p className="text-sm text-slate-500">What we look for in ideal candidates</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl text-amber-800 text-sm font-medium">
                    <Lock size={16} /> Admin Edit Mode
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <AnimatePresence mode="popLayout">
                  {settings?.requirements.map((req, idx) => (
                    <motion.div 
                      key={idx}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-blue-500 shrink-0" />
                        <span className="text-slate-700 font-medium">{req}</span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => removeRequirement(idx)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {isAdmin ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newReq}
                      onChange={(e) => setNewReq(e.target.value)}
                      placeholder="Add a new requirement..."
                      className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button 
                      onClick={addRequirement}
                      disabled={isSaving || !newReq.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <PlusCircle size={20} /> Add
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={resetDefaults}
                      className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                    >
                      <Undo2 size={14} /> Reset to Defaults
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm justify-center">
                  <Info size={16} /> Sign in as admin to edit requirements
                </div>
              )}
            </div>
          </section>

          {/* Application Form Redirect */}
          <section className="mb-16">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-center text-white shadow-2xl shadow-slate-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl -mr-32 -mt-32 rounded-full" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-3xl -ml-32 -mb-32 rounded-full" />
              
              <h2 className="text-3xl font-bold mb-4 relative z-10">Ready to Apply?</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto relative z-10">
                Take the first step towards your future. Submit your profile through our official application form.
              </p>
              
              <a 
                href={settings?.formUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-white/10 relative z-10"
              >
                Open Application Form <ExternalLink size={20} />
              </a>

              {isAdmin && (
                <div className="mt-10 pt-10 border-t border-white/10 max-w-xl mx-auto relative z-10">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Admin: Update Form URL</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={settings?.formUrl}
                      onChange={(e) => updateFormUrl(e.target.value)}
                      className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Video Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Youtube size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Wisdom from Nitin Dua</h2>
                  <p className="text-sm text-slate-500">Insights on purpose and intentional living</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scroll("left")} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => scroll("right")} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar"
            >
              {VIDEOS.map((video) => (
                <VideoCard 
                  key={video.id} 
                  video={video} 
                  onSelect={(id) => setSelectedVideoId(id)} 
                />
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center pt-10 border-t border-slate-200">
            <p className="text-slate-400 text-sm mb-6">© 2026 Internship Nexus. All rights reserved.</p>
            <a 
              href="https://linktr.ee/nitindua" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-black transition-all"
            >
              Explore More Resources <ExternalLink size={16} />
            </a>
          </footer>
        </main>

        {/* Video Modal */}
        <AnimatePresence>
          {selectedVideoId && (
            <VideoModal 
              videoId={selectedVideoId} 
              onClose={() => setSelectedVideoId(null)} 
            />
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold ${
                toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
