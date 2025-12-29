import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user } = useAuth();

  return (
    // 1. REMOVED 'bg-slate-50'. Now the body background shows through.
    <div className="min-h-screen"> 
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Added a slight text shadow for better readability on clouds */}
        <h1 className="text-4xl font-bold text-teal-800 mb-4 drop-shadow-sm">
          Welcome to Respi-Guard
        </h1>

        <p className="text-slate-700 text-lg mb-8 font-medium">
          A personalized respiratory health assistant that combines real-time
          air quality data with AI-driven medical guidance.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          {!user && (
            <Link
              to="/login"
              className="bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 shadow-lg transition-all"
            >
              Login / Signup
            </Link>
          )}

          {user && (
            <>
              <Link
                to="/dashboard"
                className="bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 shadow-lg transition-all"
              >
                Go to Dashboard
              </Link>

              <Link
                to="/chat"
                // Changed to semi-transparent white for glass effect
                className="bg-white/80 backdrop-blur-sm border border-teal-600 text-teal-700 px-6 py-3 rounded-xl hover:bg-white transition-all shadow-sm"
              >
                Ask Respi-Guard
              </Link>
            </>
          )}
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
          {/* GLASS CARDS: changed 'bg-white' to 'bg-white/60 backdrop-blur-md' */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50">
            <h3 className="font-semibold mb-2 text-teal-900">Live AQI Monitoring</h3>
            <p className="text-sm text-slate-700">
              Get real-time air quality updates based on your location.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50">
            <h3 className="font-semibold mb-2 text-teal-900">Medical Twin</h3>
            <p className="text-sm text-slate-700">
              Advice tailored to your personal respiratory conditions.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50">
            <h3 className="font-semibold mb-2 text-teal-900">AI Health Advisory</h3>
            <p className="text-sm text-slate-700">
              Evidence-based recommendations powered by medical guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}