import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, Phone, Mail, LogIn, Shield, MessageSquare, LineChart, Users, Building2, Settings, Send, Globe, Languages, Rocket, Bot, Zap, Link, Layout } from "lucide-react";

/**
 * AI SaaS Intelligent Chatbot – Frontend Demo
 * -------------------------------------------------
 * Goals
 * - Dynamic, modern, sleek UI using TailwindCSS, shadcn/ui, Framer Motion
 * - Color theme #215c56 (teal green) with subtle animations
 * - Login page: Phone-based auth + Gmail-based auth (mocked here with stubs)
 * - Role selection: Sign in as Admin or User
 * - Post-login onboarding form: org name, email, vertical, upload FAQ (csv/docx/pdf), integration method, language prefs
 * - "Submit" then launches a RAG-style chatbot demo with confidence threshold + agent handoff (Slack/Teams/Zendesk webhooks – stubbed)
 * - Every message logged (simulated) to localStorage; Admin dashboard shows basic stats
 * - Designed to be wired to zero/low-cost backends: Firebase Auth (Google + Phone), MongoDB Atlas Free/Supabase, LiteLLM proxy, open-source embeddings (SentenceTransformers), and Gemini API / IndicBERT / IndicTrans for en↔ta / Tanglish
 *
 * Back-end contracts (to implement securely):
 * - POST /api/auth/google  -> {token,id,email,name,role}
 * - POST /api/auth/phone   -> {token,id,phone,name,role}
 * - POST /api/onboarding   -> {orgId, orgName, email, vertical, languages, integration, filesMeta}
 * - POST /api/upload       -> multipart/form-data {file}
 * - POST /api/chat         -> {orgId, userId, message} -> {answer, confidence, sources}
 * - POST /api/agentNotify  -> {orgId, conversationId, message, channel:"slack|teams|zendesk"}
 * - GET  /api/stats        -> {messagesToday, avgLatencyMs, deflections, handoffs}
 * - All endpoints must enforce auth (JWT/Cookies), RBAC (admin/user), rate limits, and input validation.
 *
 * SECURITY NOTES:
 * - Use HTTP-only secure cookies for session, rotate refresh tokens, enable CSRF protection (SameSite=Lax/Strict) where applicable.
 * - Validate and virus-scan uploads (ClamAV/Lambda) and parse server-side only. Store in object storage (e.g., Cloudflare R2/S3) with presigned URLs.
 * - Sanitize prompts, strip PII if policy demands, log only necessary metadata.
 * - Never expose API keys (Gemini/HF/Twilio/Slack/Zendesk) to client. Keep in server-side env vars.
 *
 * ZERO-COST GUIDANCE:
 * - Auth: Google Sign-In (Firebase Auth free tier). NOTE: Phone OTP may incur SMS fees in most regions; consider email magic link/passkeys as a $0 fallback.
 * - DB/Logs: MongoDB Atlas free tier OR Supabase/Postgres free tier.
 * - Vectors: Free self-hosted Weaviate/pgvector or free-tier Pinecone/supabase-vector.
 * - Models: Gemini 1.5 Flash for English (free tier), IndicBERT/IndicTrans from Hugging Face (free, host on free CPU where feasible), fast embeddings (all-MiniLM-L6-v2) locally.
 */

// --- Theming helpers ---
const PRIMARY = "#215c56"; // requested theme
const soft = (opacity = 0.08) => `rgba(33,92,86,${opacity})`;

// --- Minimal local logger simulating DB writes ---
const LOG_KEY = "ai-saas-logs";
const getLogs = () => {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
};
const pushLog = (entry) => {
  const logs = getLogs();
  logs.push({ ...entry, ts: Date.now() });
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
};

// --- Fake RAG: local embeddings & toy confidence calc (client-side demo only) ---
function cosineSim(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}
function tinyEmbed(str) {
  // Toy hash-based embedding for demo-only. Replace with server-side embeddings.
  const vec = new Array(48).fill(0);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    vec[c % 48] += 1;
  }
  return vec.map((v) => v / (str.length || 1));
}

// --- Demo static FAQ data ("general faqs of various organizations") ---
const STATIC_FAQS = [
  { q: "What are your opening hours?", a: "Our standard hours are 9am–6pm, Mon–Sat.", verticals: ["supermarket","beauty parlour","fitness","restaurant","education","travel","finance","health"] },
  { q: "Do you offer refunds?", a: "Yes, within 7 days with receipt or order ID.", verticals: ["supermarket","restaurant","education","travel","fitness","beauty parlour"] },
  { q: "Hi", a: "Hello,How can I help you", verticals: ["supermarket","restaurant","education","travel","fitness","beauty parlour","health"] },
  { q: "How to contact support?", a: "Email support@company.com or WhatsApp the widget.", verticals: ["health","finance","education","travel","restaurant","fitness"] },
];

// Pre-compute embeddings for static FAQs
const STATIC_INDEX = STATIC_FAQS.map((f) => ({ ...f, emb: tinyEmbed(f.q + " " + f.a) }));

// --- Components ---

function CompanyHeader({ org }) {
  return (
    <div className="w-full sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderBottom: `1px solid ${soft(0.25)}` }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: PRIMARY }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold" style={{ color: PRIMARY }}>{org?.name || "AI SaaS Chatbot"}</div>
            
          </div>
        </div>
       
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      // TODO: Replace with real Google Sign-In
      await new Promise((r) => setTimeout(r, 700));
      onLogin({ id: "u_google_1", name: "Google User", email: "user@gmail.com", role });
    } catch (e) { setError("Google sign-in failed"); }
    finally { setLoading(false); }
  };

  const handlePhone = async () => {
    setLoading(true); setError("");
    try {
      // TODO: Replace with Firebase Phone Auth (reCAPTCHA + SMS). Note: may incur SMS costs
      await new Promise((r) => setTimeout(r, 900));
      if (!/^[+0-9][0-9\-\s]{6,}$/.test(phone)) throw new Error("Invalid phone");
      onLogin({ id: "u_phone_1", name: "Phone User", phone, role });
    } catch (e) { setError(e.message || "Phone sign-in failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] grid place-items-center p-4" style={{ background: `linear-gradient(135deg, ${soft(0.25)}, white)` }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-xl">
        <Card className="border-0 shadow-xl rounded-2xl" style={{ boxShadow: `0 10px 40px ${soft(0.5)}` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl" style={{ color: PRIMARY }}>
              <Shield className="w-6 h-6" /> Sign in
            </CardTitle>
            <div className="text-sm text-gray-500">Choose role & authenticate. Phone or Gmail.</div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl" style={{ border: `1px dashed ${soft(0.6)}` }}>
              <div className="text-sm">Role</div>
              <div className="flex gap-3 items-center">
                <Badge className={"cursor-pointer " + (role === "admin" ? "" : "opacity-60")} onClick={() => setRole("admin")} style={{ background: role === "admin" ? PRIMARY : soft(0.2), color: role === "admin" ? "white" : PRIMARY }}>Admin</Badge>
                <Badge className={"cursor-pointer " + (role === "user" ? "" : "opacity-60")} onClick={() => setRole("user")} style={{ background: role === "user" ? PRIMARY : soft(0.2), color: role === "user" ? "white" : PRIMARY }}>User</Badge>
                <Badge className={"cursor-pointer " + (role === "both" ? "" : "opacity-60")} onClick={() => setRole("both")} style={{ background: role === "both" ? PRIMARY : soft(0.2), color: role === "both" ? "white" : PRIMARY }}>Admin/User</Badge>
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Phone</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. +91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button disabled={loading} onClick={handlePhone} style={{ background: PRIMARY }}>
                  <Phone className="w-4 h-4 mr-2" /> Phone OTP
                </Button>
              </div>
            </div>

            <div className="relative text-center text-xs text-gray-400">
              <span className="bg-white px-2 relative z-10">or</span>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t" style={{ borderColor: soft(0.5) }} />
            </div>

            <Button disabled={loading} onClick={handleGoogle} className="w-full h-11 text-white" style={{ background: PRIMARY }}>
              <LogIn className="w-4 h-4 mr-2" /> Continue with Google
            </Button>

            {error && (
              <Alert className="bg-red-50/80 border-red-200">
                <AlertTitle>Authentication error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-gray-500">
              By continuing, you agree to our Terms & Privacy. Phone OTP may incur nominal SMS costs;
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function OnboardingForm({ user, onSubmit }) {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [vertical, setVertical] = useState("health");
  const [integration, setIntegration] = useState("widget");
  const [lang, setLang] = useState("both");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = (e) => setFiles(Array.from(e.target.files || []));

  const handleSubmit = async () => {
    setSubmitting(true);
    // TODO: call /api/onboarding and /api/upload for each file (with presigned URLs)
    await new Promise((r) => setTimeout(r, 600));
    onSubmit({ name: orgName || "My Organisation", email, vertical, integration, lang, files });
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg rounded-2xl" style={{ boxShadow: `0 10px 30px ${soft(0.4)}` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl" style={{ color: PRIMARY }}>
              <Building2 className="w-6 h-6" /> Company onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Organisation name</Label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. GreenMart" />
              </div>
              <div>
                <Label>Work email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div>
                <Label>Vertical</Label>
                <Select value={vertical} onValueChange={setVertical}>
                  <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                  <SelectContent>
                    {[
                      "health","fitness","supermarket","beauty parlour","finance","education","restaurant","travel",
                    ].map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Integration method</Label>
                <Select value={integration} onValueChange={setIntegration}>
                  <SelectTrigger><SelectValue placeholder="Select integration" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="widget">Website widget</SelectItem>
                    <SelectItem value="landing">Landing page</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Languages preferred</Label>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger><SelectValue placeholder="Select languages" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="tamil">Tamil</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Upload FAQs (CSV, DOCX, PDF)</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border" style={{ borderColor: soft(0.6) }}>
                  <Input type="file" multiple accept=".csv,.pdf,.doc,.docx" onChange={handleUpload} />
                  <Button variant="outline" className="rounded-xl" style={{ borderColor: PRIMARY, color: PRIMARY }}>
                    <Upload className="w-4 h-4 mr-2" /> Browse
                  </Button>
                </div>
                {files?.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">{files.length} file(s) selected</div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={submitting} className="h-11 px-6 text-white rounded-xl" style={{ background: PRIMARY }}>
                <Rocket className="w-4 h-4 mr-2" /> Submit & Launch
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function ChatMessage({ who = "bot", text = "", sources = [], confidence = 1 }) {
  const isBot = who === "bot";
  return (
    <div className={`flex gap-3 ${isBot ? "" : "justify-end"}`}>
      {isBot && (
        <Avatar className="w-8 h-8"><AvatarFallback>B</AvatarFallback></Avatar>
      )}
      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isBot ? "bg-gray-50" : "text-white"}`} style={{ background: isBot ? soft(0.25) : PRIMARY }}>
        <div>{text}</div>
        {isBot && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="rounded-xl" style={{ borderColor: PRIMARY, color: PRIMARY }}>conf: {(confidence*100).toFixed(0)}%</Badge>
            {sources?.slice(0,3).map((s, i) => (
              <Badge key={i} variant="outline" className="rounded-xl" title={s} style={{ borderColor: PRIMARY, color: PRIMARY }}>src {i+1}</Badge>
            ))}
          </div>
        )}
      </div>
      {!isBot && (
        <Avatar className="w-8 h-8"><AvatarFallback>U</AvatarFallback></Avatar>
      )}
    </div>
  );
}

function Chatbot({ org, user, onHandoff }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState([ { who: "bot", text: `Hi! I can answer ${org.vertical} FAQs for ${org.name}. Ask away!`, confidence: 1 } ]);
  const [latency, setLatency] = useState(0);
  const handoffThreshold = 0.55; // configurable

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { who: "user", text: input };
    setMsgs((m) => [...m, userMsg]);
    const start = performance.now();
    setBusy(true); setInput("");

    // Simulated RAG: retrieve from static + uploaded titles; compute toy confidence
    const q = userMsg.text;
    const qv = tinyEmbed(q);
    const cand = STATIC_INDEX.filter((f) => f.verticals.includes(org.vertical));
    let best = { a: "I'm not fully sure. I've notified a human agent.", sources: ["general-faq"], confidence: 0.4 };
    let topScore = 0;
    for (const c of cand) {
      const s = cosineSim(qv, c.emb);
      if (s > topScore) { topScore = s; best = { a: c.a, sources: ["static"], confidence: Math.min(0.95, 0.4 + s) }; }
    }
    // TODO: server-side: hybrid retrieval (BM25 + vectors) over org FAqs + general FAQs, then route to Gemini/IndicBERT. Translate with IndicTrans if ta.

    const elapsed = performance.now() - start;
    setLatency(elapsed);

    // Log message (simulate DB write)
    pushLog({ org: org.name, userId: user.id, role: user.role, message: q, latencyMs: Math.round(elapsed), confidence: best.confidence });

    // Handoff if low confidence
    if (best.confidence < handoffThreshold) {
      onHandoff({ text: q, channel: "slack" }); // stub
    }

    setMsgs((m) => [...m, { who: "bot", text: best.a, confidence: best.confidence, sources: best.sources }]);
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="border-0 shadow-lg rounded-2xl" style={{ boxShadow: `0 10px 30px ${soft(0.3)}` }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: PRIMARY }}>
            <MessageSquare className="w-5 h-5" /> Chatbot (RAG demo)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[360px] overflow-y-auto pr-2 flex flex-col gap-3">
            {msgs.map((m, i) => <ChatMessage key={i} {...m} />)}
          </div>
          <div className="text-xs text-gray-500">Latency: {Math.round(latency)} ms</div>
          <div className="flex gap-2">
            <Input placeholder="Type your question..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <Button onClick={send} disabled={busy} className="h-11 px-6 text-white rounded-xl" style={{ background: PRIMARY }}>
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ messagesToday: 0, avgLatencyMs: 0, deflections: 0, handoffs: 0 });

  useEffect(() => {
    const logs = getLogs();
    const today = new Date(); today.setHours(0,0,0,0);
    const todays = logs.filter(l => l.ts >= today.getTime());
    const lat = todays.map(l => l.latencyMs);
    const avg = lat.length ? Math.round(lat.reduce((a,b)=>a+b,0)/lat.length) : 0;
    const handoffs = todays.filter(l => (l.confidence||0) < 0.55).length;
    const deflections = todays.length - handoffs; // simplistic
    setStats({ messagesToday: todays.length, avgLatencyMs: avg, deflections, handoffs });
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Messages today", value: stats.messagesToday, icon: MessageSquare },
          { label: "Avg latency", value: stats.avgLatencyMs + " ms", icon: Zap },
          { label: "Deflections", value: stats.deflections, icon: Shield },
          { label: "Handoffs", value: stats.handoffs, icon: Users },
        ].map((m, i) => (
          <Card key={i} className="border-0 shadow rounded-2xl" style={{ boxShadow: `0 6px 24px ${soft(0.25)}` }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">{m.label}</div>
                  <div className="text-2xl font-semibold" style={{ color: PRIMARY }}>{m.value}</div>
                </div>
                <m.icon className="w-6 h-6" style={{ color: PRIMARY }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [view, setView] = useState("chat"); // chat | dashboard

  const handleSubmitOrg = (orgInfo) => {
    const o = { id: "org_1", ...orgInfo };
    setOrg(o);
  };

  const handleHandoff = async ({ text, channel }) => {
    // TODO: POST /api/agentNotify with Slack/Teams Webhook or Zendesk Create Ticket
    console.log("Agent notified via", channel, "for", text);
  };

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(180deg, white, ${soft(0.2)})` }}>
      <CompanyHeader org={org || { name: "BizAssist AI" }} />

      {!user && <LoginScreen onLogin={setUser} />}

      {user && !org && <OnboardingForm user={user} onSubmit={handleSubmitOrg} />}

      {user && org && (
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <Tabs value={view} onValueChange={setView}>
              <TabsList className="rounded-2xl" style={{ background: soft(0.25) }}>
                <TabsTrigger value="chat" className="rounded-xl">Chat</TabsTrigger>
                <TabsTrigger value="dashboard" className="rounded-xl">Dashboard</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="rounded-xl" style={{ borderColor: PRIMARY, color: PRIMARY }}>{user.role?.toUpperCase()}</Badge>
              <Button variant="outline" className="rounded-xl" onClick={() => { setUser(null); setOrg(null); }} style={{ borderColor: PRIMARY, color: PRIMARY }}>
                Logout
              </Button>
            </div>
          </div>

          {view === "chat" ? (
            <Chatbot org={org} user={user} onHandoff={handleHandoff} />
          ) : (
            <Dashboard />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-6">© {new Date().getFullYear()} AI SaaS Chatbot </div>

      <style>{`
        :root {
          --brand: ${PRIMARY};
        }
        .shadow-brand {
          box-shadow: 0 10px 30px ${soft(0.4)};
        }
      `}</style>
    </div>
  );
}
