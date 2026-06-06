import { useState } from "react";
import { useGmenSettings, useGmenClasses, useGmenEnrollments, useGmenChangeRequests } from "../supabase";

const GOLD = "#F5C025";

export default function GmenEnrollmentView({ user, signOut }) {
  const { settings } = useGmenSettings();
  const { classes } = useGmenClasses();
  const { enrollments, enroll, seatCount } = useGmenEnrollments(settings.active_period);
  const { changeRequests, requestChange } = useGmenChangeRequests();

  const [confirmClass, setConfirmClass] = useState(null); // class object to confirm enrollment
  const [changeTarget, setChangeTarget] = useState(null); // class to switch to
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const period = settings.active_period || 1;
  const myEnrollment = enrollments.find(e => e.student_email === user.email);
  const myClass = myEnrollment ? classes.find(c => c.id === myEnrollment.class_id) : null;
  const myPendingRequest = changeRequests.find(
    r => r.student_email === user.email && r.grading_period === period && r.status === "pending"
  );

  const openClasses = classes.filter(c => c.grading_period === period && c.is_open);

  async function handleEnroll(cls) {
    if (working) return;
    setWorking(true);
    setMessage(null);
    const { error } = await enroll(user.email, user.user_metadata?.full_name || user.email, cls.id, period);
    setWorking(false);
    setConfirmClass(null);
    if (error) {
      if (error.code === "23505") setMessage({ type: "error", text: "You are already enrolled in a class for this period." });
      else setMessage({ type: "error", text: "Enrollment failed. Please try again." });
    } else {
      setMessage({ type: "success", text: `Enrolled in ${cls.class_name}!` });
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
    else setMessage({ type: "success", text: `Change request submitted for ${cls.class_name}. Awaiting admin approval.` });
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = user.user_metadata?.full_name || user.email;

  return (
    <div style={{
      minHeight: "100vh", background: "#000", color: "#fff",
      fontFamily: "'Inter', sans-serif",
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

        {/* Current enrollment status */}
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

        {/* Classes grid */}
        {settings.enrollment_open && (
          <>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Available Classes — Period {period}
            </div>
            {openClasses.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "3rem 0" }}>
                No classes are open for enrollment yet.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {openClasses.map(cls => {
                const seats = seatCount(cls.id);
                const full = seats >= cls.max_seats;
                const isEnrolled = myEnrollment?.class_id === cls.id;
                const fillPct = Math.min(100, Math.round((seats / cls.max_seats) * 100));
                const hasPending = !!myPendingRequest;

                return (
                  <div key={cls.id} style={{
                    background: isEnrolled ? `rgba(245,192,37,0.07)` : "rgba(255,255,255,0.04)",
                    border: isEnrolled ? `1px solid ${GOLD}50` : full ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "1.25rem",
                    opacity: full && !isEnrolled ? 0.55 : 1,
                    transition: "border 0.2s",
                    display: "flex", flexDirection: "column", gap: "0.5rem",
                  }}>
                    {full && !isEnrolled && (
                      <div style={{
                        alignSelf: "flex-start", background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4,
                        fontSize: "0.7rem", fontWeight: 700, color: "#ef4444",
                        padding: "0.15rem 0.5rem", letterSpacing: "0.08em",
                      }}>FULL</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{cls.class_name}</div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
                      {cls.teacher_name}{cls.room ? ` · Room ${cls.room}` : ""}
                    </div>
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
                    {/* Action button */}
                    {isEnrolled ? (
                      !hasPending && (
                        <button onClick={() => setChangeTarget(cls)} style={{
                          marginTop: 6, padding: "0.45rem 0", borderRadius: 7,
                          background: "transparent", border: `1px solid ${GOLD}50`,
                          color: GOLD, fontSize: "0.82rem", cursor: "pointer", fontWeight: 500,
                        }}>Request Change</button>
                      )
                    ) : (
                      !full && !myEnrollment && (
                        <button onClick={() => setConfirmClass(cls)} disabled={working} style={{
                          marginTop: 6, padding: "0.45rem 0", borderRadius: 7,
                          background: GOLD, border: "none",
                          color: "#000", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700,
                        }}>Select This Class</button>
                      )
                    )}
                    {!isEnrolled && myEnrollment && !full && !hasPending && (
                      <button onClick={() => setChangeTarget(cls)} style={{
                        marginTop: 6, padding: "0.45rem 0", borderRadius: 7,
                        background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", cursor: "pointer",
                      }}>Request Switch</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm enroll modal */}
      {confirmClass && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14, padding: "2rem", width: "min(400px, 92vw)",
          }}>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Confirm Enrollment
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Enroll in <strong style={{ color: "#fff" }}>{confirmClass.class_name}</strong> with {confirmClass.teacher_name}?
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => handleEnroll(confirmClass)} disabled={working} style={{
                flex: 1, padding: "0.6rem", background: GOLD, border: "none",
                color: "#000", fontWeight: 700, borderRadius: 8, cursor: "pointer",
              }}>
                {working ? "Enrolling…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmClass(null)} style={{
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
