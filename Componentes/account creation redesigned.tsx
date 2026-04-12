/**
 * CasaFlow — Account Creation / Register Page
 * Palette: Navy #0f2553 · White #fff · Gold accent #b8963e
 * Font: DM Sans (Google Fonts)
 *
 * Drop this file into frontend/src/pages/RegisterPage.tsx
 * (already applied — this copy is for reference)
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, AlertCircle, User, Mail, Lock, Building2 } from "lucide-react";

/* ── Design tokens ───────────────────────────────────────────── */
const T = {
  navy:    "#0f2553",
  navyMid: "#1a3a6e",
  gold:    "#b8963e",
  goldLt:  "#d4af5a",
  white:   "#ffffff",
  offWhite:"#f8f9fc",
  border:  "#dce3ef",
  muted:   "#6b7a99",
  error:   "#c0392b",
};

/* ── CasaFlow Logo (SVG — house + gold S-curve) ──────────────── */
const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size * 1.1} viewBox="0 0 200 220" fill="none">
    <path d="M30 110 L100 45 L170 110" stroke={T.navy} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M30 110 L30 175" stroke={T.navy} strokeWidth="14" strokeLinecap="round" fill="none"/>
    <path d="M170 110 L170 175" stroke={T.navy} strokeWidth="14" strokeLinecap="round" fill="none"/>
    <path d="M120 175 L120 140 Q120 118 140 118 Q162 118 162 140 L162 175" stroke={T.navy} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M60 85 C60 118, 145 118, 145 152" stroke={T.gold} strokeWidth="13" strokeLinecap="round" fill="none"/>
  </svg>
);

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px 12px 40px",
  borderRadius: 10,
  border: `1.5px solid ${T.border}`,
  background: T.offWhite,
  fontSize: 14,
  color: T.navy,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  transition: "border-color 180ms, box-shadow 180ms, background 180ms",
};

const ROLES = [
  { value: "CONSULTANT",   label: "Consultor",         Icon: User },
  { value: "AGENCY_OWNER", label: "Diretor de Agência", Icon: Building2 },
];

export default function AccountCreation() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "CONSULTANT", agencyName: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = T.navyMid;
    e.target.style.boxShadow = "0 0 0 3px rgba(15,37,83,0.1)";
    e.target.style.background = T.white;
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = T.border;
    e.target.style.boxShadow = "none";
    e.target.style.background = T.offWhite;
  };

  const iconStyle: React.CSSProperties = {
    position: "absolute", left: 13, top: "50%",
    transform: "translateY(-50%)", color: T.muted, pointerEvents: "none",
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', sans-serif", background: T.white }}>

        {/* Left panel */}
        <div style={{ width: "38%", background: T.navy, flexDirection: "column", justifyContent: "space-between", padding: "48px 52px", position: "relative", overflow: "hidden", display: "flex" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", border: "56px solid rgba(184,150,62,0.07)" }} />
          <div style={{ position: "absolute", bottom: -50, left: -50, width: 280, height: 280, borderRadius: "50%", border: "44px solid rgba(255,255,255,0.04)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 14, zIndex: 1 }}>
            <Logo size={34} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.white, letterSpacing: "-0.02em" }}>CASA<span style={{ fontWeight: 400 }}>FLOW</span></div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 1 }}>CRM Imobiliário</div>
            </div>
          </div>

          <div style={{ zIndex: 1 }}>
            <div style={{ width: 40, height: 3, background: T.gold, borderRadius: 2, marginBottom: 28 }} />
            <h2 style={{ fontSize: 33, fontWeight: 700, color: T.white, lineHeight: 1.2, letterSpacing: "-0.03em", margin: "0 0 18px" }}>
              Junte-se a centenas<br />de profissionais<br /><span style={{ color: T.goldLt }}>imobiliários.</span>
            </h2>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Crie a sua conta gratuitamente e comece hoje mesmo.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 40 }}>
              {["✓  Gestão de contactos e leads", "✓  Pipeline de oportunidades", "✓  Catálogo de propriedades", "✓  Relatórios e análises"].map(i => (
                <div key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>{i}</div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0, zIndex: 1 }}>
            © {new Date().getFullYear()} CasaFlow · Todos os direitos reservados
          </p>
        </div>

        {/* Right: form */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 400 }}>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: T.navy, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Criar conta</h1>
              <p style={{ fontSize: 14, color: T.muted, margin: 0, fontWeight: 300 }}>Registe-se gratuitamente</p>
            </div>

            <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, padding: "28px 28px 24px", boxShadow: "0 2px 8px rgba(15,37,83,0.04), 0 12px 40px rgba(15,37,83,0.07)" }}>

              <AnimatePresence>
                {error && (
                  <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", marginBottom: 18 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, overflow: "hidden", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.2)", color: T.error, fontSize: 13 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={(e) => { e.preventDefault(); if (form.password !== form.confirm) setError("As passwords não coincidem."); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Role picker */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Perfil</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {ROLES.map(({ value, label, Icon }) => {
                        const active = form.role === value;
                        return (
                          <button key={value} type="button" onClick={() => setForm(f => ({ ...f, role: value }))}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif", background: active ? "rgba(15,37,83,0.07)" : T.offWhite, border: active ? `1.5px solid ${T.navy}` : `1.5px solid ${T.border}`, color: active ? T.navy : T.muted, transition: "all 160ms" }}>
                            <Icon size={13} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Agency name */}
                  <AnimatePresence initial={false}>
                    {form.role === "AGENCY_OWNER" && (
                      <motion.div key="agency" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Nome da Agência</label>
                        <div style={{ position: "relative" }}>
                          <Building2 size={14} style={iconStyle} />
                          <input type="text" value={form.agencyName} onChange={set("agencyName")} placeholder="Nome da sua agência" style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Name */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Nome completo</label>
                    <div style={{ position: "relative" }}>
                      <User size={14} style={iconStyle} />
                      <input type="text" value={form.name} onChange={set("name")} placeholder="João Silva" required autoFocus style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Email</label>
                    <div style={{ position: "relative" }}>
                      <Mail size={14} style={iconStyle} />
                      <input type="email" value={form.email} onChange={set("email")} placeholder="joao@agencia.pt" required style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <Lock size={14} style={iconStyle} />
                      <input type={show ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Mínimo 6 caracteres" minLength={6} style={{ ...inputBase, paddingRight: 44 }} onFocus={onFocus} onBlur={onBlur} />
                      <button type="button" tabIndex={-1} onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, display: "flex" }}>
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Confirmar password</label>
                    <div style={{ position: "relative" }}>
                      <Lock size={14} style={iconStyle} />
                      <input type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Repita a password" style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" style={{ width: "100%", padding: "13px 20px", marginTop: 4, borderRadius: 10, border: "none", background: T.navy, color: T.white, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 18px rgba(15,37,83,0.28)", transition: "background 200ms, transform 150ms", letterSpacing: "-0.01em" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.navyMid; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.navy; }}>
                    Criar conta <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            </div>

            <p style={{ textAlign: "center", fontSize: 14, color: T.muted, marginTop: 22, fontWeight: 300 }}>
              Já tem conta?{" "}
              <a href="/login" style={{ color: T.navy, fontWeight: 600, textDecoration: "none", borderBottom: `1.5px solid ${T.gold}`, paddingBottom: 1 }}>
                Entrar
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
