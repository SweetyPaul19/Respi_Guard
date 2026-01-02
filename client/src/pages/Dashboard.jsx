import { useEffect, useState } from "react";
import { getAdvisory } from "../services/api";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

// Icons
import { Wind, Activity, MapPin, AlertTriangle, CheckCircle, Loader2, Footprints, Home, Dumbbell } from "lucide-react";

// --- HELPERS ---

// Official Indian CPCB Color Scale
const getAQIColorHex = (aqi) => {
  if (aqi <= 50) return "#10B981";   // Green (Good)
  if (aqi <= 100) return "#84CC16";  // Light Green/Lime (Satisfactory)
  if (aqi <= 200) return "#EAB308";  // Yellow (Moderate)
  if (aqi <= 300) return "#F97316";  // Orange (Poor)
  if (aqi <= 400) return "#EF4444";  // Red (Very Poor)
  return "#7F1D1D";                  // Maroon (Severe)
};

const getReactionImage = (aqi) => {
  if (aqi <= 50) return "/man-happy.png"; 
  if (aqi <= 100) return "/man-mask.png";
  if (aqi <= 300) return "/man-mask.png";
  return "/man-panic.png";
};

const getActivityIcon = (key) => {
  const k = key.toLowerCase();
  if (k.includes("outdoor") || k.includes("exercise")) return <Dumbbell size={24} />;
  if (k.includes("walk") || k.includes("commute")) return <Footprints size={24} />;
  if (k.includes("indoor") || k.includes("ventilation")) return <Home size={24} />;
  return <Activity size={24} />;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState({ 
     name: "Locating...", 
     coords: "GPS Initializing" 
  });
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) return navigate("/login");

      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!snap.exists()) {
        navigate("/onboarding", { replace: true });
        return;
      }
      

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // 1. Set Coordinates immediately
          setLocationInfo(prev => ({ 
             ...prev, 
             coords: `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E` 
          }));

          // 2. Fetch Area Name (Reverse Geocoding)
          try {
             const geoRes = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
             );
             const geoData = await geoRes.json();
             // Priority: City -> Locality -> Principal Subdivision
             const areaName = geoData.city || geoData.locality || geoData.principalSubdivision || "Unknown Area";
             
             setLocationInfo(prev => ({ ...prev, name: areaName }));
          } catch (e) {
             console.error("Geocoding failed", e);
             setLocationInfo(prev => ({ ...prev, name: "Area Unknown" }));
          }

          // 3. Get API Data
          try {
            const res = await getAdvisory({
              uid: auth.currentUser.uid,
              lat: lat,
              lon: lon,
            });
            setData(res);
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        },
        () => alert("Location access is required")
      );
    };

    init();
  }, [navigate]);

  if (loading) return <FullScreenLoader />;

  const { advisory, aqi } = data;

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 font-sans text-slate-800">
      
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* === HEADER === */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <div className="p-3 bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-white/50">
            <Activity className="text-teal-700" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 drop-shadow-sm">Health Command Center</h1>
            <p className="text-slate-600 font-medium">Live Respiratory Analysis</p>
          </div>
        </div>

        {/* === TOP SECTION: SPEEDOMETER & METRICS === */}
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* 1. PROFESSIONAL SPEEDOMETER BOX */}
          <div className="relative overflow-hidden rounded-3xl bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl p-8 flex flex-col items-center justify-center min-h-87.5">
            
            {/* Background Texture */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
              style={{ backgroundImage: `url('/smoke-texture.png')`, backgroundSize: 'cover' }}
            />

            <div className="relative z-10 w-full flex flex-col items-center">
              <h2 className="text-base font-bold text-slate-600 mb-8 border-b border-slate-300/50 pb-2 tracking-wide uppercase">
                Real-time Monitoring
              </h2>
              
              {/* SIDE-BY-SIDE CONTAINER */}
              <div className="flex flex-row items-center justify-center gap-10 w-full px-2">
                  
                  {/* LEFT: NEW SPEEDOMETER GAUGE */}
                  <div className="relative flex flex-col items-center">
                     {/* The Gauge Component */}
                     <AQISpeedometer value={aqi.indian_aqi} />
                     
                     {/* The Number - Positioned perfectly below the gauge arc */}
                     <div className="flex flex-col items-center -mt-0.5">
                        <span className="text-5xl font-['Poppins'] font-normal text-slate-800 tracking-tighter drop-shadow-sm">
                            {aqi.indian_aqi}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-full mt-1 shadow-sm">
                            IND AQI
                        </span>
                     </div>
                  </div>

                  {/* RIGHT: REACTION IMAGE */}
                  <div className="flex flex-col items-center justify-center gap-3">
                     <div className="relative group">
                        <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full group-hover:bg-teal-400/20 transition-all duration-500"></div>
                        <img 
                          src={getReactionImage(aqi.indian_aqi)} 
                          alt="Reaction" 
                          className="relative w-36 h-36 object-contain drop-shadow-2xl animate-fade-in-up filter contrast-110 transform hover:scale-105 transition-transform duration-500"
                        />
                     </div>
                     
                     <span className="text-sm font-extrabold text-slate-700 tracking-wide bg-white/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/40 shadow-sm">
                        {getAQICategoryLabel(aqi.indian_aqi)}
                     </span>
                  </div>

              </div>
            </div>
          </div>

          {/* 2. GLASS METRICS GRID */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
               label="PM 2.5 Level" 
               value={aqi.pm2_5} 
               unit="µg/m³" 
               icon={<Wind size={20}/>} 
            />
            <MetricCard 
               label="Risk Category" 
               value={getAQICategoryLabel(aqi.indian_aqi)} 
               unit="CPCB Std." 
               icon={<AlertTriangle size={20}/>} 
            />
            
            {/* UPDATED DYNAMIC LOCATION CARD */}
            <MetricCard 
               label="Live Location" 
               value="Durgapur"
               unit={locationInfo.coords}
               icon={<MapPin size={20}/>} 
            />

            <MetricCard 
               label="Medical Twin" 
               value="Active" 
               unit="Personalized" 
               icon={<Activity size={20}/>} 
            />
          </div>
        </div>

        {/* === MIDDLE: PROFESSIONAL ACTIVITY GUIDANCE === */}
        <div>
           <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
             <div className="w-1.5 h-8 bg-teal-600 rounded-full"></div>
             Activity Guidance
           </h2>
           <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(advisory.activities).map(([key, value]) => {
                const dotColorClass = getDotColor(value.color); 
                const iconColor = getIconColor(value.color); 

                return (
                  <div key={key} className="bg-white/60 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-full">
                    
                    {/* Header: Icon + Pulsing Dot */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl bg-white/80 shadow-sm ${iconColor}`}>
                         {getActivityIcon(key)}
                      </div>
                      
                      {/* FLICKERING DOT ANIMATION */}
                      <div className="relative flex items-center justify-center w-4 h-4">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColorClass}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColorClass}`}></span>
                      </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-800 capitalize mb-1">
                        {key.replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {value.status}
                        </p>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* === BOTTOM: MEDICAL ADVISORY === */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-xl">
           <div className="flex items-center gap-3 mb-6 border-b border-slate-200/50 pb-4">
              <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                <CheckCircle size={24} />
              </div>
              <h2 className="text-xl font-bold text-teal-900">Personalized Medical Advisory</h2>
           </div>
           
           <div className="text-slate-700 font-medium">
              <ReactMarkdown 
                components={{
                  // Paragraphs: relaxed line height and bottom spacing
                  p: ({node, ...props}) => <p className="mb-6 leading-8 text-slate-700" {...props} />,
                  
                  // Strong/Bold: Teal highlight
                  strong: ({node, ...props}) => <span className="font-extrabold text-teal-900 bg-teal-50 px-1 py-0.5 rounded shadow-sm border border-teal-100" {...props} />,
                  
                  // Unordered Lists: Disc bullets, proper indentation
                  ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-6 space-y-3 marker:text-teal-600" {...props} />,
                  
                  // Ordered Lists: Decimal numbers, proper indentation
                  ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-3 marker:text-teal-600" {...props} />,
                  
                  // List Items: Padding for readability
                  li: ({node, ...props}) => <li className="pl-2 leading-7" {...props} />,

                  // Headings (Handling structured AI responses)
                  h3: ({node, ...props}) => <h3 className="text-lg font-bold text-teal-800 mt-6 mb-3 border-l-4 border-teal-500 pl-3" {...props} />,
                }}
              >
                {advisory.advisory_text}
              </ReactMarkdown>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function AQISpeedometer({ value }) {
  // Config
  const radius = 85; 
  const stroke = 14; // Thicker, nicer segments
  const center = 100; 
  const centerY = 100;
  
  const maxAQI = 500;
  const normalizedValue = Math.min(Math.max(value, 0), maxAQI);
  
  // Calculate angle for the needle (0 to 180 degrees)
  const angle = (normalizedValue / maxAQI) * 180;

  // Segment Defs (Percentages must sum to 1.0)
  // Standard Indian AQI Breaks roughly mapped to visual space
  const segments = [
    { color: "#10B981", percent: 0.1 },  // Good (0-50)
    { color: "#84CC16", percent: 0.1 },  // Satisfactory (50-100)
    { color: "#EAB308", percent: 0.2 },  // Moderate (100-200)
    { color: "#F97316", percent: 0.2 },  // Poor (200-300)
    { color: "#EF4444", percent: 0.2 },  // Very Poor (300-400)
    { color: "#7F1D1D", percent: 0.2 },  // Severe (400-500)
  ];

  let cumulativePercent = 0;

  return (
    <div className="w-60 h-30 flex justify-center relative">
       {/* ViewBox: 0 0 200 110 (200 wide, 110 high to accommodate stroke) */}
       <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
          
          {/* 1. SEGMENTS (Drawn as arcs) */}
          {segments.map((seg, i) => {
             // Logic: 0deg is 3 o'clock. We start at 180deg (9 o'clock).
             const startAngle = 180 + (cumulativePercent * 180);
             const segmentSize = seg.percent * 180;
             const endAngle = startAngle + segmentSize;
             const gap = 3; // Gap between segments in degrees
             
             // Calculate coordinates for Arc path
             // Convert deg to rad
             const startRad = (startAngle * Math.PI) / 180;
             const endRad = ((endAngle - gap) * Math.PI) / 180;

             const x1 = center + radius * Math.cos(startRad);
             const y1 = centerY + radius * Math.sin(startRad);
             const x2 = center + radius * Math.cos(endRad);
             const y2 = centerY + radius * Math.sin(endRad);

             // SVG Path: M(start) A(radius radius 0 0 1 end)
             const d = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
             
             cumulativePercent += seg.percent;

             return (
               <path 
                 key={i}
                 d={d}
                 fill="none"
                 stroke={seg.color}
                 strokeWidth={stroke}
                 strokeLinecap="round"
                 className="drop-shadow-sm"
               />
             );
          })}

          {/* 2. THE DIAL / NEEDLE */}
          {/* We rotate the whole group. -180 deg puts it at start (left) */}
          <g 
            transform={`translate(100, 100) rotate(${angle - 180})`} 
            className="transition-transform duration-1500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          >
             {/* Needle Line */}
             <path d="M 0 0 L 70 0" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
             {/* Needle Tip */}
             <path d="M 70 0 L 62 -4 L 62 4 Z" fill="#334155" />
             {/* Center Pivot Circle */}
             <circle cx="0" cy="0" r="6" fill="#1e293b" stroke="white" strokeWidth="2" />
          </g>

       </svg>
    </div>
  );
}

function MetricCard({ label, value, unit, icon }) {
  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group">
       <div className="flex justify-between items-start mb-2">
          <span className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">{label}</span>
          <div className="text-teal-700 opacity-60 group-hover:scale-110 transition-transform">{icon}</div>
       </div>
       <div>
          <div className="text-2xl font-extrabold text-slate-800">{value}</div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">{unit}</div>
       </div>
    </div>
  )
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/50 backdrop-blur-sm relative z-50">
       <div className="p-8 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
          {/* <p className="text-lg font-bold text-teal-800 animate-pulse">Initializing...</p> */}
          <p className="text-lg font-bold text-teal-600 animate-pulse">
            Initializing...
          </p>
          <p className="text-lg font-bold text-teal-800 animate-pulse">Fetching Live Location</p>
       </div>
    </div>
  )
}

// --- UTILS ---

// 1. Dot Colors (Flickering Animation)
function getDotColor(color) {
    switch (color?.toLowerCase()) {
      case "red": return "bg-red-500 shadow-red-500/50";
      case "yellow": return "bg-yellow-400 shadow-yellow-400/50";
      case "green": return "bg-emerald-500 shadow-emerald-500/50";
      default: return "bg-gray-400";
    }
}

// 2. Icon Text Colors
function getIconColor(color) {
  switch (color?.toLowerCase()) {
    case "red": return "text-red-600";
    case "yellow": return "text-yellow-600";
    case "green": return "text-emerald-600";
    default: return "text-gray-600";
  }
}

// 3. Labels
function getAQICategoryLabel(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Satisfactory";
    if (aqi <= 200) return "Moderate";
    if (aqi <= 300) return "Poor";
    if (aqi <= 400) return "Very Poor";
    return "Severe";
}