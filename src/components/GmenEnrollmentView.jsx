import { useState } from "react";
import { useGmenSettings, useGmenClasses, useGmenEnrollments, useGmenChangeRequests, useGmailSend } from "../supabase";

const GOLD = "#F5C025";

function classById(classes, id) { return classes.find(c => c.id === id); }

function rankMessage(rank, className) {
  if (rank === "a") return "This was your first choice.";
  if (rank === "b") return "Your first choice was full, so this is your second choice.";
  if (rank === "overflow") return `Both of your choices were full, so you've been placed in ${className} for now.`;
  return "";
}

export default function GmenEnrollmentView({ user, signOut }) {
  const { settings } = useGmenSettings();
  const { classes } = useGmenClasses();
  const { enrollments, enrollGmen, seatCount } = useGmenEnrollments(settings.active_period);
  const { changeRequests, requestChange } = useGmenChangeRequests();
  const { requestGmailToken, sendEmail } = useGmailSend();

  const [pickA, setPickA] = useState(null);
  const [pickB, setPickB] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [changeTarget, setChangeTarget] = useState(null); // class to switch to
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const period = settings.active_period || 1;
  const myEnrollment = enrollments.find(e => e.student_email === user.email);
  const myClass = myEnrollment ? classById(classes, myEnrollment.class_id) : null;
  const myPendingRequest = changeRequests.find(
    r => r.student_email === user.email && r.grading_period === period && r.status === "pending"
  );

  // The Commons/overflow class is never a direct choice — it's only where an
  // unfilled first-and-second choice lands a student automatically.
  const openClasses = classes.filter(c => c.grading_period === period && c.is_open && !c.is_default);

  function pick(cls, rank) {
    if (rank === "a") {
      setPickA(prev => prev === cls.id ? null : cls.id);
      if (pickB === cls.id) setPickB(null);
    } else {
      setPickB(prev => prev === cls.id ? null : cls.id);
      if (pickA === cls.id) setPickA(null);
    }
  }

  async function handleSubmit() {
    if (working || !pickA) return;
    setWorking(true);
    setMessage(null);
    const { data, error } = await enrollGmen(pickA, pickB, {
      givenName: user.user_metadata?.given_name,
      familyName: user.user_metadata?.family_name,
      fullName: user.user_metadata?.full_name,
    });
    setWorking(false);
    setConfirmSubmit(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("not on the student roster")) {
        setMessage({ type: "error", text: "We couldn't match your Google account to the student roster. Please see the office to get this fixed." });
      } else if (msg.includes("enrollment is closed")) {
        setMessage({ type: "error", text: "Enrollment just closed. Check back or ask your teacher." });
      } else if (msg.includes("no room and no overflow")) {
        setMessage({ type: "error", text: "Both your choices are full and there's no overflow class set up yet — please see the office." });
      } else {
        setMessage({ type: "error", text: "Enrollment failed. Please try again." });
      }
      return;
    }
    const assignedClass = classById(classes, data.class_id);
    setPickA(null); setPickB(null);
    if (assignedClass) {
      setMessage({
        type: "success",
        text: `You're in ${assignedClass.class_name} — ${assignedClass.teacher_name}${assignedClass.room ? `, Room ${assignedClass.room}` : ""}. ${rankMessage(data.choice_rank, assignedClass.class_name)}`,
      });
      // best-effort confirmation email from student's own Gmail
      (async () => {
        try {
          const token = await requestGmailToken();
          await sendEmail(token, {
            to: user.email,
            from: user.email,
            subject: `G-Men Enrollment Confirmed — ${assignedClass.class_name}`,
            body: [
              `Hi ${user.user_metadata?.full_name || ""},`,
              "",
              `You're enrolled in ${assignedClass.class_name} with ${assignedClass.teacher_name}${assignedClass.room ? ` in Room ${assignedClass.room}` : ""}.`,
              "",
              "G-Men Period runs Tuesday, Wednesday, and Thursday during 4th Period.",
              "If you need to change classes, visit the enrollment page and submit a change request.",
              "",
              "— James A. Garfield High School",
            ].join("\n"),
          });
        } catch { /* silent — enrollment already succeeded */ }
      })();
    }
  }

  async function handleRequestChange(cls) {
    if (working) return;
    setWorking(true);
    setMessage(null);
    const { error } = await requestChange(
      user.email,
      user.user_metadata?.full_name || user.email,
      myEnrollment?.class_id || null,
      cls.id,
      period
    );
    setWorking(false);
    setChangeTarget(null);
    if (error) setMessage({ type: "error", text: "Request failed. Please try again." });
    else setMessage({ type: "success", text: "Change request submitted. An admin will review it and let you know." });
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = user.user_metadata?.full_name || user.email;
  const pickedA = pickA ? classById(classes, pickA) : null;
  const pickedB = pickB ? classById(classes, pickB) : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#000", color: "#fff",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem",
        background: "linear-gradient(180deg, #111 0%, #000 100%)",
        borderBottom: "1px solid rgba(245,192,37,0.2)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: GOLD, letterSpacing: "0.03em" }}>
            G-Men Period Enrollment
          </div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            Grading Period {period}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {avatarUrl && <img src={avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${GOLD}40` }} />}
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>{displayName}</span>
          <button onClick={signOut} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.8rem",
            fontSize: "0.8rem", cursor: "pointer",
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Enrollment closed banner */}
        {!settings.enrollment_open && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "2rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 4 }}>Enrollment is not currently open</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Check back soon — your teacher will let you know when it opens.</div>
          </div>
        )}

        {/* Current enrollment status — teacher and room are fine to show here: this is after assignment */}
        {myClass && (
          <div style={{
            background: `rgba(245,192,37,0.07)`,
            border: `1px solid ${GOLD}40`,
            borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "0.5rem",
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Currently Enrolled</div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{myClass.class_name}</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>{myClass.teacher_name} · Room {myClass.room}</div>
            </div>
            <div style={{
              background: `${GOLD}20`, border: `1px solid ${GOLD}60`,
              color: GOLD, borderRadius: 20, padding: "0.25rem 0.85rem",
              fontSize: "0.8rem", fontWeight: 600,
            }}>Enrolled ✓</div>
          </div>
        )}

        {/* Pending change request */}
        {myPendingRequest && (
          <div style={{
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem",
            fontSize: "0.85rem", color: "rgba(255,255,255,0.7)",
          }}>
            ⏳ You have a pending request to switch to <strong style={{ color: "#fff" }}>
              {classes.find(c => c.id === myPendingRequest.to_class_id)?.class_name || "another class"}
            </strong>. Awaiting admin approval.
          </div>
        )}

        {/* Message toast */}
        {message && (
          <div style={{
            background: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem",
            fontSize: "0.9rem",
          }}>
            {message.text}
            <button onClick={() => setMessage(null)} style={{
              marginLeft: "1rem", background: "transparent", border: "none",
              color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.85rem",
            }}>✕</button>
          </div>
        )}

        {/* Not yet enrolled: blind first-choice / second-choice picker */}
        {settings.enrollment_open && !myClass && (
          <>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Choose Two Options — Period {period}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              You'll find out which teacher runs each class after you're placed — pick based on the activity.
              We'll try your first choice, then your second, then place you in the period's study hall if both are full.
            </div>

            {openClasses.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "3rem 0" }}>
                No classes are open for enrollment yet.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
              {openClasses.map(cls => {
                const seats = seatCount(cls.id);
                const full = seats >= cls.max_seats;
                const isA = pickA === cls.id;
                const isB = pickB === cls.id;
                const fillPct = Math.min(100, Math.round((seats / cls.max_seats) * 100));

                return (
                  <div key={cls.id} style={{
                    background: isA || isB ? `rgba(245,192,37,0.07)` : "rgba(255,255,255,0.04)",
                    border: isA ? `1px solid ${GOLD}` : isB ? `1px solid ${GOLD}60` : full ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "1.25rem",
                    opacity: full && !isA && !isB ? 0.55 : 1,
                    transition: "border 0.2s",
                    display: "flex", flexDirection: "column", gap: "0.5rem",
                  }}>
                    {full && !isA && !isB && (
                      <div style={{
                        alignSelf: "flex-start", background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4,
                        fontSize: "0.7rem", fontWeight: 700, color: "#ef4444",
                        padding: "0.15rem 0.5rem", letterSpacing: "0.08em",
                      }}>FULL</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{cls.class_name}</div>
                    {cls.description && (
                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.45, flexGrow: 1 }}>
                        {cls.description}
                      </div>
                    )}
                    {/* Seat fill bar */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                        <span>Seats</span>
                        <span>{seats} / {cls.max_seats}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                        <div style={{
                          height: "100%", borderRadius: 2,
                          width: `${fillPct}%`,
                          background: full ? "#ef4444" : fillPct > 75 ? "#f97316" : GOLD,
                          transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: 6 }}>
                      <button onClick={() => pick(cls, "a")} disabled={full && !isA} style={{
                        flex: 1, padding: "0.4rem 0", borderRadius: 7,
                        background: isA ? GOLD : "transparent",
                        border: isA ? "none" : `1px solid ${GOLD}50`,
                        color: isA ? "#000" : GOLD, fontSize: "0.78rem", fontWeight: 700,
                        cursor: full && !isA ? "not-allowed" : "pointer",
                      }}>{isA ? "✓ 1st Choice" : "1st Choice"}</button>
                      <button onClick={() => pick(cls, "b")} disabled={full && !isB} style={{
                        flex: 1, padding: "0.4rem 0", borderRadius: 7,
                        background: isB ? "rgba(245,192,37,0.25)" : "transparent",
                        border: isB ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.15)",
                        color: isB ? GOLD : "rgba(255,255,255,0.6)", fontSize: "0.78rem", fontWeight: 700,
                        cursor: full && !isB ? "not-allowed" : "pointer",
                      }}>{isB ? "✓ 2nd Choice" : "2nd Choice"}</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {openClasses.length > 0 && (
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  1st: <strong style={{ color: "#fff" }}>{pickedA?.class_name || "not selected"}</strong>
                  {"   ·   "}
                  2nd: <strong style={{ color: "#fff" }}>{pickedB?.class_name || "none"}</strong>
                </div>
                <button onClick={() => setConfirmSubmit(true)} disabled={!pickA || working} style={{
                  background: pickA ? GOLD : "rgba(255,255,255,0.1)", border: "none",
                  color: pickA ? "#000" : "rgba(255,255,255,0.4)", fontWeight: 700,
                  borderRadius: 8, padding: "0.55rem 1.5rem", cursor: pickA ? "pointer" : "not-allowed", fontSize: "0.9rem",
                }}>Submit</button>
              </div>
            )}
          </>
        )}

        {/* Already enrolled: request a switch to a different (still anonymized) class */}
        {settings.enrollment_open && myClass && !myPendingRequest && (
          <>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Want to Switch? — Period {period}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {openClasses.filter(c => c.id !== myClass.id).map(cls => {
                const seats = seatCount(cls.id);
                const full = seats >= cls.max_seats;
                const fillPct = Math.min(100, Math.round((seats / cls.max_seats) * 100));
                return (
                  <div key={cls.id} style={{
                    background: "rgba(255,255,255,0.04)",
                    border: full ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "1.25rem", opacity: full ? 0.55 : 1,
                    display: "flex", flexDirection: "column", gap: "0.5rem",
                  }}>
                    {full && (
                      <div style={{
                        alignSelf: "flex-start", background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4,
                        fontSize: "0.7rem", fontWeight: 700, color: "#ef4444",
                        padding: "0.15rem 0.5rem", letterSpacing: "0.08em",
                      }}>FULL</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{cls.class_name}</div>
                    {cls.description && (
                      <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.45, flexGrow: 1 }}>
                        {cls.description}
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                        <span>Seats</span>
                        <span>{seats} / {cls.max_seats}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${fillPct}%`, background: full ? "#ef4444" : fillPct > 75 ? "#f97316" : GOLD, transition: "width 0.3s" }} />
                      </div>
                    </div>
                    {!full && (
                      <button onClick={() => setChangeTarget(cls)} style={{
                        marginTop: 6, padding: "0.45rem 0", borderRadius: 7,
                        background: "transparent", border: `1px solid ${GOLD}50`,
                        color: GOLD, fontSize: "0.82rem", cursor: "pointer", fontWeight: 500,
                      }}>Request This Class</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm submit modal — still no teacher name; nothing's assigned yet */}
      {confirmSubmit && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "2rem", width: "min(420px, 92vw)",
          }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Confirm Your Choices
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              First choice: <strong style={{ color: "#fff" }}>{pickedA?.class_name}</strong><br />
              Second choice: <strong style={{ color: "#fff" }}>{pickedB?.class_name || "none — you may land in the period's study hall if your first choice is full"}</strong>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handleSubmit} disabled={working} style={{
                flex: 1, padding: "0.6rem", background: GOLD, border: "none",
                color: "#000", fontWeight: 700, borderRadius: 8, cursor: "pointer",
              }}>
                {working ? "Enrolling…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmSubmit(false)} style={{
                flex: 1, padding: "0.6rem", background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
                borderRadius: 8, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm change request modal */}
      {changeTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "2rem", width: "min(400px, 92vw)",
          }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Request Class Change
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Request to switch to <strong style={{ color: "#fff" }}>{changeTarget.class_name}</strong>?
              An admin will need to approve your request.
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => handleRequestChange(changeTarget)} disabled={working} style={{
                flex: 1, padding: "0.6rem", background: GOLD, border: "none",
                color: "#000", fontWeight: 700, borderRadius: 8, cursor: "pointer",
              }}>
                {working ? "Submitting…" : "Submit Request"}
              </button>
              <button onClick={() => setChangeTarget(null)} style={{
                flex: 1, padding: "0.6rem", background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
                borderRadius: 8, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
