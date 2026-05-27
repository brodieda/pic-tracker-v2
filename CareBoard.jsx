Only in working/pic-tracker: package-lock.json
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/CareBoard.jsx working/pic-tracker/src/components/CareBoard.jsx
--- pic-tracker-v2/pic-tracker/src/components/CareBoard.jsx	2026-05-27 06:50:20.281003924 +0000
+++ working/pic-tracker/src/components/CareBoard.jsx	2026-05-27 06:56:10.210667049 +0000
@@ -321,6 +321,26 @@
             ⚕
           </span>
         )}
+        {pic.ejectionFlag && (
+          <span
+            className={`text-base leading-none ${
+              pic.securityNotified === true
+                ? 'text-code-5'
+                : pic.securityNotified === false
+                ? 'text-code-1'
+                : 'text-ink-300'
+            }`}
+            title={
+              pic.securityNotified === true
+                ? 'Security Monitored — Security notified at discharge'
+                : pic.securityNotified === false
+                ? 'Security Monitored — Security NOT notified at discharge'
+                : 'Security Monitored — notification status not recorded'
+            }
+          >
+            ⚑
+          </span>
+        )}
       </div>
 
       {/* Right: outcome + duration */}
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/DischargeModal.jsx working/pic-tracker/src/components/DischargeModal.jsx
--- pic-tracker-v2/pic-tracker/src/components/DischargeModal.jsx	2026-05-27 06:50:20.281633682 +0000
+++ working/pic-tracker/src/components/DischargeModal.jsx	2026-05-27 06:54:32.123308868 +0000
@@ -16,6 +16,8 @@
   const [editingLastKpe, setEditingLastKpe] = useState(false)
   const [tlSignoff, setTlSignoff] = useState(null)
   const [editingTlSignoff, setEditingTlSignoff] = useState(false)
+  const [securityNotified, setSecurityNotified] = useState(null)
+  const [softWarnOpen, setSoftWarnOpen] = useState(false)
 
   useEffect(() => {
     if (open && pic) {
@@ -29,12 +31,16 @@
       setEditingLastKpe(false)
       setTlSignoff(null)
       setEditingTlSignoff(false)
+      setSecurityNotified(null)
+      setSoftWarnOpen(false)
     }
   }, [open, pic])
 
   if (!open || !pic) return null
 
-  const submit = () => {
+  const isEjectionFlagged = !!pic.ejectionFlag
+
+  const finaliseDischarge = () => {
     dischargePic(pic.id, {
       leftCare,
       outcome,
@@ -44,11 +50,21 @@
       medicalInvolved,
       lastKpe,
       tlSignoff,
+      securityNotified: isEjectionFlagged ? securityNotified : null,
     })
     onDischarged?.()
     onClose?.()
   }
 
+  const submit = () => {
+    // Soft warning when flagged AND security not notified
+    if (isEjectionFlagged && securityNotified === false) {
+      setSoftWarnOpen(true)
+      return
+    }
+    finaliseDischarge()
+  }
+
   return (
     <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm">
       <div className="w-full sm:max-w-2xl max-h-[100vh] sm:max-h-[92vh] bg-ink-950 sm:rounded-2xl border border-ink-800 flex flex-col overflow-hidden shadow-2xl">
@@ -70,6 +86,23 @@
 
         {/* Body */}
         <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
+          {/* Security Monitored reminder — first thing they see */}
+          {isEjectionFlagged && (
+            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-slate-100 text-ink-950 border-2 border-slate-100">
+              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink-950 text-slate-100 text-sm font-display font-black shrink-0 leading-none">
+                ⚑
+              </span>
+              <div className="min-w-0 flex-1">
+                <div className="text-xs font-display font-bold uppercase tracking-widest">
+                  Security Monitored — Action Required
+                </div>
+                <div className="text-sm mt-0.5">
+                  This patron is on the ejection pathway. RSA/Security must be notified before they leave the space.
+                </div>
+              </div>
+            </div>
+          )}
+
           {/* Time out — editor open by default in live mode */}
           <div>
             <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2 flex items-center justify-between">
@@ -149,6 +182,37 @@
             </div>
           </div>
 
+          {/* Security/RSA notified — only shown when ejection flag is set */}
+          {isEjectionFlagged && (
+            <div>
+              <div className="text-[10px] font-display tracking-[0.22em] uppercase text-ink-400 mb-2">
+                Security / RSA notified?
+              </div>
+              <div className="grid grid-cols-2 gap-3">
+                <button
+                  onClick={() => setSecurityNotified(securityNotified === false ? null : false)}
+                  className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
+                    securityNotified === false
+                      ? 'bg-code-1 text-white border-white shadow-lg'
+                      : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
+                  }`}
+                >
+                  No
+                </button>
+                <button
+                  onClick={() => setSecurityNotified(securityNotified === true ? null : true)}
+                  className={`h-16 rounded-xl font-display font-bold text-xl border-2 transition ${
+                    securityNotified === true
+                      ? 'bg-code-5 text-white border-white shadow-lg'
+                      : 'bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500'
+                  }`}
+                >
+                  Yes
+                </button>
+              </div>
+            </div>
+          )}
+
           {/* Last KPE */}
           <div className="panel p-4">
             <div className="flex items-center justify-between mb-2">
@@ -232,6 +296,43 @@
           </button>
         </div>
       </div>
+
+      {/* Soft warning when discharging a flagged PIC without notifying security */}
+      {softWarnOpen && (
+        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
+          <div className="w-full sm:max-w-md bg-ink-950 rounded-2xl border-2 border-slate-100 shadow-2xl overflow-hidden">
+            <div className="px-5 py-4 border-b border-ink-800 flex items-center gap-3">
+              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-ink-950 font-display font-black">
+                ⚑
+              </span>
+              <h3 className="font-display font-bold text-base text-ink-100">
+                Security not notified
+              </h3>
+            </div>
+            <div className="px-5 py-4 text-sm text-ink-200">
+              This patron was flagged as Security Monitored and you've recorded that
+              Security/RSA has <span className="font-bold text-code-1">not</span> been notified.
+              <div className="mt-2 text-ink-400">
+                Discharge anyway?
+              </div>
+            </div>
+            <div className="px-5 py-3 border-t border-ink-800 flex items-center justify-end gap-2">
+              <button className="btn-ghost" onClick={() => setSoftWarnOpen(false)}>
+                Go back
+              </button>
+              <button
+                className="btn bg-code-1 text-white hover:opacity-90"
+                onClick={() => {
+                  setSoftWarnOpen(false)
+                  finaliseDischarge()
+                }}
+              >
+                Discharge anyway
+              </button>
+            </div>
+          </div>
+        </div>
+      )}
     </div>
   )
 }
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/EventLog.jsx working/pic-tracker/src/components/EventLog.jsx
--- pic-tracker-v2/pic-tracker/src/components/EventLog.jsx	2026-05-27 06:50:20.281633682 +0000
+++ working/pic-tracker/src/components/EventLog.jsx	2026-05-27 06:54:51.437465409 +0000
@@ -7,6 +7,7 @@
   note: 'Note',
   check: 'Welfare check',
   discharge: 'Discharged',
+  flag_change: 'Flag change',
 }
 
 const TYPE_TONE = {
@@ -16,9 +17,21 @@
   note: 'border-ink-600 text-ink-300',
   check: 'border-code-5 text-code-5',
   discharge: 'border-ink-500 text-ink-200',
+  flag_change: 'border-ink-300 text-ink-100',
+}
+
+function flagChangeSummary(meta) {
+  if (!meta) return null
+  if (meta.flag === 'ejection') {
+    return meta.value
+      ? '⚑ Flagged Security Monitored'
+      : '⚑ Security Monitored flag cleared'
+  }
+  return null
 }
 
 export function EventLogItem({ event }) {
+  const flagSummary = event.type === 'flag_change' ? flagChangeSummary(event.meta) : null
   return (
     <li
       className={`pl-3 border-l-2 py-1.5 ${TYPE_TONE[event.type] || 'border-ink-700 text-ink-300'}`}
@@ -37,6 +50,9 @@
           {formatDateTime(event.timestamp)}
         </span>
       </div>
+      {flagSummary && (
+        <div className="text-sm text-ink-200 mt-1 leading-snug font-medium">{flagSummary}</div>
+      )}
       {event.note && (
         <div className="text-sm text-ink-200 mt-1 leading-snug">{event.note}</div>
       )}
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/IntakeModal.jsx working/pic-tracker/src/components/IntakeModal.jsx
--- pic-tracker-v2/pic-tracker/src/components/IntakeModal.jsx	2026-05-27 06:50:20.281633682 +0000
+++ working/pic-tracker/src/components/IntakeModal.jsx	2026-05-27 06:52:41.909075105 +0000
@@ -36,6 +36,7 @@
   ageRange: null,
   description: '',
   intakeNote: '',
+  ejectionFlag: false,
 }
 
 // Inline row layout: label left, content right. Wraps cleanly on narrow screens.
@@ -148,6 +149,8 @@
       medicalInvolved: null,
       lastKpe: null,
       tlSignoff: null,
+      ejectionFlag: !!form.ejectionFlag,
+      securityNotified: null,
       status: 'in_care',
     }
 
@@ -362,6 +365,39 @@
             />
           </FieldRow>
 
+          <FieldRow label="Security monitored" hint="RSA/Security ejection or possible security intervention">
+            <button
+              type="button"
+              onClick={() => update({ ejectionFlag: !form.ejectionFlag })}
+              aria-pressed={form.ejectionFlag}
+              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${
+                form.ejectionFlag
+                  ? 'bg-slate-100 border-slate-100 text-ink-950'
+                  : 'bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-500'
+              }`}
+            >
+              <span
+                className={`flex items-center justify-center w-6 h-6 rounded border-2 text-xs font-bold shrink-0 transition ${
+                  form.ejectionFlag
+                    ? 'bg-ink-950 border-ink-950 text-slate-100'
+                    : 'bg-ink-950 border-ink-600 text-transparent'
+                }`}
+                aria-hidden="true"
+              >
+                ✓
+              </span>
+              <span className="flex-1">
+                <span className="font-display font-bold text-sm tracking-wide flex items-center gap-2">
+                  <span aria-hidden="true">⚑</span>
+                  Flag as Security Monitored
+                </span>
+                <span className="block text-[11px] mt-0.5 opacity-80 normal-case font-normal">
+                  Patron is on the ejection pathway — RSA/Security must be notified before they leave the space.
+                </span>
+              </span>
+            </button>
+          </FieldRow>
+
           {/* Optional disclosure */}
           <div className="border-t border-ink-800 pt-5">
             <button
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/PicCard.jsx working/pic-tracker/src/components/PicCard.jsx
--- pic-tracker-v2/pic-tracker/src/components/PicCard.jsx	2026-05-27 06:50:20.281633682 +0000
+++ working/pic-tracker/src/components/PicCard.jsx	2026-05-27 06:53:01.345136393 +0000
@@ -177,8 +177,16 @@
             )}
           </div>
 
-          {/* Right cluster: MH (if ever) + code pill + time stack with optional mark-checked button */}
+          {/* Right cluster: SEC + MH (if ever) + code pill + time stack with optional mark-checked button */}
           <div className="flex items-start gap-2 shrink-0">
+            {pic.ejectionFlag && (
+              <span
+                className="inline-flex items-center gap-1 bg-slate-100 text-ink-950 text-[10px] font-display font-bold uppercase tracking-widest px-1.5 h-7 rounded-md shrink-0 border border-slate-100"
+                title="Security Monitored — RSA/Security to be notified before discharge"
+              >
+                ⚑ SEC
+              </span>
+            )}
             {everCode2 && !isDischarged && (
               <span
                 className="inline-flex items-center gap-1 bg-code-2/15 border border-code-2/50 text-code-2 text-[10px] font-display font-bold uppercase tracking-widest px-1.5 h-7 rounded-md shrink-0"
@@ -270,6 +278,33 @@
                 </span>
               </>
             )}
+            {isDischarged && pic.ejectionFlag && (
+              <>
+                <span className="text-ink-700">·</span>
+                <span
+                  className={`text-[10px] rounded px-1.5 py-0.5 font-bold uppercase tracking-widest shrink-0 border ${
+                    pic.securityNotified === true
+                      ? 'bg-code-5/15 border-code-5/40 text-code-5'
+                      : pic.securityNotified === false
+                      ? 'bg-code-1/15 border-code-1/40 text-code-1'
+                      : 'bg-ink-800 border-ink-700 text-ink-400'
+                  }`}
+                  title={
+                    pic.securityNotified === true
+                      ? 'Security notified at discharge'
+                      : pic.securityNotified === false
+                      ? 'Security NOT notified at discharge'
+                      : 'Security notification not recorded'
+                  }
+                >
+                  {pic.securityNotified === true
+                    ? '✓ Sec notified'
+                    : pic.securityNotified === false
+                    ? '✗ Sec not notified'
+                    : 'Sec ?'}
+                </span>
+              </>
+            )}
             {isDischarged && referredToDisplay.length > 0 && (
               <>
                 <span className="text-ink-700">·</span>
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/PicDetailPanel.jsx working/pic-tracker/src/components/PicDetailPanel.jsx
--- pic-tracker-v2/pic-tracker/src/components/PicDetailPanel.jsx	2026-05-27 06:50:20.281633682 +0000
+++ working/pic-tracker/src/components/PicDetailPanel.jsx	2026-05-27 06:53:37.015549711 +0000
@@ -21,6 +21,7 @@
   code3MonitorStateFor,
   minutesSinceLastActivity,
   latestEventFor,
+  setEjectionFlag,
 } from '../lib/helpers'
 import { completenessFor } from '../lib/completeness'
 import {
@@ -180,6 +181,11 @@
     afterMutation()
   }
 
+  const onToggleEjection = () => {
+    setEjectionFlag(pic.id, !pic.ejectionFlag, assignedKpe)
+    afterMutation()
+  }
+
   return (
     <PanelShell onClose={onClose}>
       {/* Header */}
@@ -315,6 +321,38 @@
 
       {/* Body */}
       <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
+        {/* Security Monitored banner — actionable reminder */}
+        {pic.ejectionFlag && (
+          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-slate-100 text-ink-950 border-2 border-slate-100">
+            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink-950 text-slate-100 text-sm font-display font-black shrink-0 leading-none">
+              ⚑
+            </span>
+            <div className="min-w-0 flex-1">
+              <div className="text-xs font-display font-bold uppercase tracking-widest">
+                Security Monitored
+              </div>
+              <div className="text-sm mt-0.5">
+                {isDischarged
+                  ? pic.securityNotified === true
+                    ? 'Security/RSA was notified at discharge.'
+                    : pic.securityNotified === false
+                    ? 'Security/RSA was NOT notified at discharge.'
+                    : 'Notification status not recorded.'
+                  : 'Ejection pathway — notify RSA/Security before this patron leaves the space.'}
+              </div>
+            </div>
+            {!isDischarged && (
+              <button
+                onClick={onToggleEjection}
+                className="text-[10px] uppercase tracking-widest text-ink-950/70 hover:text-ink-950 underline-offset-4 hover:underline shrink-0 self-center"
+                title="Remove the Security Monitored flag"
+              >
+                clear flag
+              </button>
+            )}
+          </div>
+        )}
+
         {/* Incomplete record banner */}
         {!complete && (
           <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-code-3/40 bg-code-3/10">
@@ -741,7 +779,17 @@
 
         {/* Discharge button — only shown when in-care */}
         {!isDischarged && (
-          <div className="pt-2">
+          <div className="pt-2 space-y-2">
+            {!pic.ejectionFlag && (
+              <button
+                onClick={onToggleEjection}
+                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-wide transition bg-ink-900 border-2 border-dashed border-ink-700 text-ink-300 hover:border-slate-100 hover:text-slate-100"
+                title="Flag this patron as Security Monitored — RSA/Security ejection pathway"
+              >
+                <span aria-hidden="true">⚑</span>
+                Flag as Security Monitored
+              </button>
+            )}
             <button
               onClick={() => setDischargeOpen(true)}
               className="btn-primary w-full text-base py-3"
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/components/Reports.jsx working/pic-tracker/src/components/Reports.jsx
--- pic-tracker-v2/pic-tracker/src/components/Reports.jsx	2026-05-27 06:50:20.283554210 +0000
+++ working/pic-tracker/src/components/Reports.jsx	2026-05-27 07:03:28.303452477 +0000
@@ -135,6 +135,27 @@
               tone={stats.medical.count > 0 ? 'danger' : null}
             />
             <StatBigNumber
+              label="Security monitored"
+              value={stats.security.flagged}
+              suffix={
+                stats.security.notification.total > 0
+                  ? `(${stats.security.notification.notified}/${stats.security.notification.total} notified)`
+                  : null
+              }
+              tone={
+                stats.security.notification.notNotified > 0
+                  ? 'danger'
+                  : stats.security.flagged > 0
+                  ? 'warn'
+                  : null
+              }
+              hint={
+                stats.security.notification.notNotified > 0
+                  ? `${stats.security.notification.notNotified} discharged without security notified`
+                  : null
+              }
+            />
+            <StatBigNumber
               label="Incomplete records"
               value={stats.counts.incomplete}
               tone={stats.counts.incomplete > 0 ? 'warn' : 'good'}
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/lib/completeness.js working/pic-tracker/src/lib/completeness.js
--- pic-tracker-v2/pic-tracker/src/lib/completeness.js	2026-05-27 06:50:20.283554210 +0000
+++ working/pic-tracker/src/lib/completeness.js	2026-05-27 06:56:16.699781426 +0000
@@ -40,6 +40,9 @@
     if (normalizeReferredTo(pic).length === 0) missing.push('Referred to')
     if (pic.medicalInvolved == null) missing.push('Medical involvement')
     if (!pic.tlSignoff) missing.push('TL sign-off')
+    if (pic.ejectionFlag && pic.securityNotified == null) {
+      missing.push('Security/RSA notification')
+    }
   }
 
   return { complete: missing.length === 0, missing }
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/lib/helpers.js working/pic-tracker/src/lib/helpers.js
--- pic-tracker-v2/pic-tracker/src/lib/helpers.js	2026-05-27 06:50:20.287094851 +0000
+++ working/pic-tracker/src/lib/helpers.js	2026-05-27 06:51:57.339259727 +0000
@@ -219,11 +219,13 @@
 }
 
 // Discharge a PIC. Sets status, leftCare, outcome, referredTo, medical, lastKpe, tlSignoff.
+// For ejection-flagged PICs also records securityNotified (null otherwise — N/A).
 // Emits a 'discharge' event with all the relevant context.
 export function dischargePic(picId, dischargeData) {
   const { pics, idx } = findPicIndex(picId)
   if (idx < 0) return null
   const ts = dischargeData.leftCare || nowIso()
+  const wasFlagged = !!pics[idx].ejectionFlag
   pics[idx] = {
     ...pics[idx],
     status: 'discharged',
@@ -235,6 +237,8 @@
     medicalInvolved: dischargeData.medicalInvolved ?? null,
     lastKpe: dischargeData.lastKpe || pics[idx].assignedKpe || null,
     tlSignoff: dischargeData.tlSignoff || null,
+    // Only record securityNotified when the PIC was flagged; otherwise N/A
+    securityNotified: wasFlagged ? (dischargeData.securityNotified ?? null) : null,
   }
   savePics(pics)
   addEvent({
@@ -252,10 +256,33 @@
       referredToOther: dischargeData.referredToOther,
       medicalInvolved: dischargeData.medicalInvolved,
       tlSignoff: dischargeData.tlSignoff,
+      // Persist the audit on the event too — null when not applicable
+      securityNotified: wasFlagged ? (dischargeData.securityNotified ?? null) : null,
     },
   })
   return pics[idx]
 }
+
+// Toggle the ejection flag on a PIC. Emits a 'flag_change' event for the audit trail.
+export function setEjectionFlag(picId, value, byKpe) {
+  const { pics, idx } = findPicIndex(picId)
+  if (idx < 0) return null
+  const newValue = !!value
+  if (pics[idx].ejectionFlag === newValue) return pics[idx]
+  pics[idx] = { ...pics[idx], ejectionFlag: newValue }
+  savePics(pics)
+  addEvent({
+    id: nextEventId(),
+    picId,
+    timestamp: nowIso(),
+    type: 'flag_change',
+    code: null,
+    kpe: byKpe || pics[idx].assignedKpe || null,
+    note: null,
+    meta: { flag: 'ejection', value: newValue },
+  })
+  return pics[idx]
+}
 
 // Reverse discharge — moves PIC back to in_care. Logs a note event for audit trail.
 export function reopenPic(picId, byKpe, reason) {
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/lib/stats.js working/pic-tracker/src/lib/stats.js
--- pic-tracker-v2/pic-tracker/src/lib/stats.js	2026-05-27 06:50:20.287094851 +0000
+++ working/pic-tracker/src/lib/stats.js	2026-05-27 06:56:32.997268197 +0000
@@ -131,6 +131,23 @@
   return Math.round((yes / eligible.length) * 100)
 }
 
+// ---------- security monitored / ejection pathway ----------
+
+export function ejectionFlaggedCount(pics) {
+  return pics.filter((p) => p.ejectionFlag === true).length
+}
+
+// Of discharged flagged PICs, how many had security notified? Returns counts split by answer.
+export function securityNotificationBreakdown(pics) {
+  const flagged = pics.filter((p) => p.ejectionFlag === true && p.status === 'discharged')
+  return {
+    total: flagged.length,
+    notified: flagged.filter((p) => p.securityNotified === true).length,
+    notNotified: flagged.filter((p) => p.securityNotified === false).length,
+    notRecorded: flagged.filter((p) => p.securityNotified == null).length,
+  }
+}
+
 // ---------- frequency lists ----------
 
 export function substanceFrequency(pics, n = 5) {
@@ -201,6 +218,10 @@
       count: medicalInvolvedCount(pics),
       pct: medicalInvolvedPct(pics),
     },
+    security: {
+      flagged: ejectionFlaggedCount(pics),
+      notification: securityNotificationBreakdown(pics),
+    },
     frequencies: {
       substances: substanceFrequency(pics, 5),
       presentations: presentationFrequency(pics, 5),
diff -u -r '--exclude=node_modules' '--exclude=dist' '--exclude=.git' pic-tracker-v2/pic-tracker/src/lib/xlsxExport.js working/pic-tracker/src/lib/xlsxExport.js
--- pic-tracker-v2/pic-tracker/src/lib/xlsxExport.js	2026-05-27 06:50:20.287094851 +0000
+++ working/pic-tracker/src/lib/xlsxExport.js	2026-05-27 06:55:05.627630103 +0000
@@ -64,6 +64,8 @@
     'Outcome': pic.outcome === 'Other' ? pic.outcomeOther || 'Other' : pic.outcome || '',
     'Referred to': joinList(normalizeReferredTo(pic), pic.referredToOther),
     'Medical involved': bool(pic.medicalInvolved),
+    'Security monitored': bool(!!pic.ejectionFlag),
+    'Security notified at discharge': pic.ejectionFlag ? bool(pic.securityNotified) : '',
     'Assigned KPE': getAssignedKpe(pic) || '',
     'Last KPE': pic.lastKpe || '',
     'TL sign-off': pic.tlSignoff || '',
