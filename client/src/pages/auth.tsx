import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  Shield,
  Sparkles,
  Stethoscope,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { login, register, seedDemoData } from "@/lib/api";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function SpaceNeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const points = Array.from({ length: 85 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: 1 + Math.random() * 1.6,
      w: 0.35 + Math.random() * 0.55,
      c: Math.random() < 0.7 ? "cyan" : "violet",
    }));

    const render = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const grd = ctx.createRadialGradient(w * 0.35, h * 0.25, 0, w * 0.35, h * 0.25, Math.max(w, h));
      grd.addColorStop(0, "rgba(0, 230, 255, 0.14)");
      grd.addColorStop(0.45, "rgba(140, 80, 255, 0.10)");
      grd.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      const time = t * 0.00008;
      for (const p of points) {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1) p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1) p.y = -0.1;
      }

      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const ax = a.x * w;
        const ay = a.y * h;

        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const bx = b.x * w;
          const by = b.y * h;
          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.hypot(dx, dy);
          if (dist > 160) continue;

          const alpha = (1 - dist / 160) * 0.18;
          ctx.strokeStyle = b.c === "violet" ? `rgba(140,80,255,${alpha})` : `rgba(0,230,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        const pulse = 0.5 + 0.5 * Math.sin(time * 18 + (a.x + a.y) * 12);
        const isViolet = a.c === "violet";
        ctx.fillStyle = isViolet
          ? `rgba(168,110,255,${0.24 + pulse * 0.22})`
          : `rgba(0,230,255,${0.24 + pulse * 0.22})`;
        ctx.beginPath();
        ctx.arc(ax, ay, a.r + pulse * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isViolet
          ? `rgba(168,110,255,${0.10})`
          : `rgba(0,230,255,${0.10})`;
        ctx.beginPath();
        ctx.arc(ax, ay, a.r * 5.2 + pulse * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let k = 0; k < 10; k++) {
        const x = (Math.sin(time * 3 + k) * 0.4 + 0.5) * w;
        const y = (Math.cos(time * 2.4 + k * 1.7) * 0.35 + 0.5) * h;
        const r = (0.14 + k * 0.04) * Math.min(w, h);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,230,255,${0.06})`);
        g.addColorStop(1, `rgba(0,0,0,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(render);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 ms-grid-bg" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      <div className="absolute inset-0 ms-noise" aria-hidden="true" />
      <div
        className="absolute -top-48 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,230,255,.18), rgba(140,80,255,.08), rgba(0,0,0,0))",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function RoleCapsule({
  role,
  active,
  title,
  subtitle,
  icon,
  onClick,
  testId,
}: {
  role: "patient" | "doctor";
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={[
        "group relative w-full rounded-2xl border px-4 py-4 text-left transition",
        "bg-white/4 backdrop-blur-xl",
        "hover:bg-white/6",
        active
          ? "border-white/18 shadow-[0_0_0_1px_rgba(0,230,255,.20),0_24px_120px_-84px_rgba(0,230,255,.55)]"
          : "border-white/10",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "grid size-10 place-items-center rounded-xl border",
            "bg-white/6",
            active
              ? "border-cyan-300/25 text-cyan-200"
              : "border-white/10 text-white/70",
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div
            className={[
              "font-serif text-sm tracking-wide",
              active ? "text-white" : "text-white/80",
            ].join(" ")}
          >
            {title}
          </div>
          <div className="mt-1 text-xs text-white/55">{subtitle}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={[
              "size-2 rounded-full",
              active ? "bg-cyan-300" : "bg-white/25",
            ].join(" ")}
          />
          <ArrowRight
            className={[
              "size-4 transition",
              active ? "text-cyan-200" : "text-white/35",
              "group-hover:translate-x-0.5",
            ].join(" ")}
            strokeWidth={2}
          />
        </div>
      </div>
      <div
        className={[
          "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity",
          "group-hover:opacity-100",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(900px 280px at 30% 0%, rgba(0,230,255,.10), rgba(140,80,255,.06), rgba(0,0,0,0))",
        }}
        aria-hidden="true"
      />
    </button>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [view, setView] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"patient" | "doctor">("patient");

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [regId, setRegId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");

  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    return view === "login" ? "Access your healthcare space" : "Create your MediSpace identity";
  }, [view]);

  const subtitle = useMemo(() => {
    if (view === "login") {
      return "Consent-first access: patients own records, doctors view only what’s granted.";
    }
    return "Set up your role and credentials. You can refine access controls anytime.";
  }, [view]);

  const idLabel = role === "patient" ? "Health Record Number" : "Medical License ID";
  const idPlaceholder = role === "patient" ? "HRN-100482" : "LIC-39017";

  const onLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      toast({
        title: "Missing details",
        description: "Enter your username and password to continue.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const user = await login(loginId.trim(), password.trim());
      
      localStorage.setItem("medispace_user", JSON.stringify({
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
      }));

      toast({
        title: "Signed in successfully",
        description:
          user.role === "patient"
            ? "Welcome back. Your records are private by default."
            : "Welcome back. You can view records from patients who granted access.",
      });

      setLocation(user.role === "patient" ? "/patient" : "/doctor");
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async () => {
    if (!fullName.trim() || !regId.trim() || !regPassword.trim()) {
      toast({
        title: "Missing details",
        description: "Fill out all required fields to create your account.",
        variant: "destructive",
      });
      return;
    }

    if (regPassword !== regPassword2) {
      toast({
        title: "Passwords don't match",
        description: "Make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      await register(regId.trim(), regPassword.trim(), role, fullName.trim());

      toast({
        title: "Account created successfully",
        description: "Now sign in to access your MediSpace dashboard.",
      });

      setView("login");
      setLoginId(regId);
      setPassword("");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onSeedDemoData = async () => {
    setBusy(true);
    try {
      const result = await seedDemoData();
      toast({
        title: "Demo data created",
        description: "Login as: " + result.credentials.patient.username + " / " + result.credentials.patient.password,
      });
    } catch (error: any) {
      toast({
        title: "Demo data ready",
        description: "Demo accounts already exist. Try logging in.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = clamp((py - 0.5) * -7, -7, 7);
    const ry = clamp((px - 0.5) * 9, -9, 9);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--rx", `0deg`);
    e.currentTarget.style.setProperty("--ry", `0deg`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SpaceNeuralBackground />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <a
          href="/auth"
          data-testid="link-logo"
          className="group inline-flex items-center gap-3"
        >
          <div className="relative grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div
              className="absolute inset-0 rounded-2xl opacity-70"
              style={{
                background:
                  "radial-gradient(140px 100px at 30% 20%, rgba(0,230,255,.22), rgba(140,80,255,.10), rgba(0,0,0,0))",
              }}
              aria-hidden="true"
            />
            <Stethoscope className="relative size-5 text-cyan-200" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="font-serif text-sm tracking-[0.18em] text-white/90">
              MEDISPACE
            </div>
            <div className="mt-0.5 text-xs text-white/55">Consent-first care OS</div>
          </div>
        </a>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65 backdrop-blur-xl">
            Privacy-first
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65 backdrop-blur-xl">
            Encrypted access (mock)
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-16 pt-10 lg:grid-cols-[1fr_460px] lg:items-start">
        <section className="pt-2 lg:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur-xl">
              <Sparkles className="size-4 text-cyan-200" strokeWidth={2.2} />
              3D sci-fi medical UI · glassmorphism · micro-interactions
            </div>

            <h1
              data-testid="text-auth-title"
              className="mt-6 max-w-xl font-serif text-4xl leading-[1.06] tracking-tight text-white sm:text-5xl"
            >
              {title}
            </h1>
            <p
              data-testid="text-auth-subtitle"
              className="mt-4 max-w-xl text-base leading-relaxed text-white/70"
            >
              {subtitle}
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <RoleCapsule
                role="patient"
                active={role === "patient"}
                title="Patient"
                subtitle="Own and control your records"
                icon={<User className="size-5" strokeWidth={2.2} />}
                onClick={() => setRole("patient")}
                testId="button-role-patient"
              />
              <RoleCapsule
                role="doctor"
                active={role === "doctor"}
                title="Doctor"
                subtitle="View only consented histories"
                icon={<Shield className="size-5" strokeWidth={2.2} />}
                onClick={() => setRole("doctor")}
                testId="button-role-doctor"
              />
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs text-white/55">
              <div className="inline-flex items-center gap-2">
                <FileText className="size-4 text-white/60" strokeWidth={2.1} />
                Categorized reports
              </div>
              <Separator orientation="vertical" className="h-4 bg-white/10" />
              <div className="inline-flex items-center gap-2">
                <Stethoscope className="size-4 text-white/60" strokeWidth={2.1} />
                Doctor access toggles
              </div>
            </div>
          </motion.div>
        </section>

        <section>
          <div
            className="ms-tilt relative rounded-3xl border border-white/12 bg-white/5 p-1 backdrop-blur-2xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform:
                "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateZ(0px)",
              transition: "transform 220ms ease",
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl opacity-80"
              style={{
                background:
                  "radial-gradient(1200px 500px at 30% 0%, rgba(0,230,255,.10), rgba(140,80,255,.06), rgba(0,0,0,0))",
              }}
              aria-hidden="true"
            />
            <div className="relative rounded-[22px] border border-white/10 bg-black/20 px-6 py-6 shadow-[0_40px_140px_-110px_rgba(0,230,255,.7)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-serif text-sm tracking-[0.16em] text-white/85">
                    {view === "login" ? "SIGN IN" : "REGISTER"}
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    {role === "patient" ? "Patient workspace" : "Doctor console"}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <Stethoscope className="size-4 text-cyan-200" strokeWidth={2.2} />
                  Secure mock
                </div>
              </div>

              <div className="mt-6">
                <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                  <TabsList className="grid w-full grid-cols-2 bg-white/5" data-testid="tabs-auth-mode">
                    <TabsTrigger value="login" data-testid="tab-login">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="login-id"
                          className="text-white/80"
                          data-testid="label-login-id"
                        >
                          {idLabel}
                        </Label>
                        <Input
                          id="login-id"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          placeholder={idPlaceholder}
                          data-testid="input-login-id"
                          className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="login-password"
                          className="text-white/80"
                          data-testid="label-login-password"
                        >
                          Password
                        </Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          data-testid="input-login-password"
                          className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                        />
                      </div>

                      <Button
                        onClick={onLogin}
                        disabled={busy}
                        data-testid="button-login"
                        className="w-full bg-gradient-to-b from-cyan-300/90 to-cyan-500/80 text-black hover:from-cyan-200/90 hover:to-cyan-400/90"
                      >
                        {busy ? "Verifying…" : "Enter MediSpace"}
                        <ArrowRight className="ml-2 size-4" strokeWidth={2.4} />
                      </Button>

                      <Separator className="my-4 bg-white/10" />

                      <Button
                        onClick={onSeedDemoData}
                        disabled={busy}
                        variant="secondary"
                        data-testid="button-seed-demo"
                        className="w-full border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      >
                        <Database className="mr-2 size-4" />
                        {busy ? "Creating..." : "Create Demo Accounts"}
                      </Button>

                      <div className="pt-3 text-center text-xs text-white/55">
                        No account yet?{" "}
                        <button
                          type="button"
                          onClick={() => setView("register")}
                          data-testid="button-go-register"
                          className="text-cyan-200 hover:text-cyan-100"
                        >
                          Create one
                        </button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="reg-name"
                            className="text-white/80"
                            data-testid="label-register-name"
                          >
                            Full Name
                          </Label>
                          <Input
                            id="reg-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Dr. A. Patel"
                            data-testid="input-register-name"
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="reg-email"
                            className="text-white/80"
                            data-testid="label-register-email"
                          >
                            Email
                          </Label>
                          <Input
                            id="reg-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@clinic.com"
                            data-testid="input-register-email"
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="reg-id"
                          className="text-white/80"
                          data-testid="label-register-id"
                        >
                          {idLabel}
                        </Label>
                        <Input
                          id="reg-id"
                          value={regId}
                          onChange={(e) => setRegId(e.target.value)}
                          placeholder={idPlaceholder}
                          data-testid="input-register-id"
                          className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="reg-password"
                            className="text-white/80"
                            data-testid="label-register-password"
                          >
                            Password
                          </Label>
                          <Input
                            id="reg-password"
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Create a password"
                            data-testid="input-register-password"
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="reg-password2"
                            className="text-white/80"
                            data-testid="label-register-password2"
                          >
                            Confirm
                          </Label>
                          <Input
                            id="reg-password2"
                            type="password"
                            value={regPassword2}
                            onChange={(e) => setRegPassword2(e.target.value)}
                            placeholder="Repeat password"
                            data-testid="input-register-password2"
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-cyan-300/30"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={onRegister}
                        disabled={busy}
                        data-testid="button-register"
                        className="w-full bg-gradient-to-b from-cyan-300/90 to-cyan-500/80 text-black hover:from-cyan-200/90 hover:to-cyan-400/90"
                      >
                        {busy ? "Creating…" : "Create account"}
                        <ArrowRight className="ml-2 size-4" strokeWidth={2.4} />
                      </Button>

                      <div className="pt-3 text-center text-xs text-white/55">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setView("login")}
                          data-testid="button-go-login"
                          className="text-cyan-200 hover:text-cyan-100"
                        >
                          Sign in
                        </button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
                    <Shield className="size-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/85" data-testid="text-privacy-title">
                      Data ownership by design
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-white/60" data-testid="text-privacy-subtitle">
                      Patients explicitly grant (and revoke) access. Doctors see only authorized records.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="text-xs text-white/60" data-testid="text-stat-1-label">Reports organized</div>
              <div className="mt-2 font-serif text-xl text-white ms-text-glow" data-testid="text-stat-1-value">
                10+\n              </div>
              <div className="mt-1 text-xs text-white/50">Categories & folders</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="text-xs text-white/60" data-testid="text-stat-2-label">AI summaries</div>
              <div className="mt-2 font-serif text-xl text-white ms-text-glow" data-testid="text-stat-2-value">
                Dual-view\n              </div>
              <div className="mt-1 text-xs text-white/50">Patient + Doctor modes</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div data-testid="text-footer-left">MediSpace · Prototype UI (frontend-only)</div>
          <div data-testid="text-footer-right">No backend wired yet · All actions are mock</div>
        </div>
      </footer>
    </div>
  );
}
