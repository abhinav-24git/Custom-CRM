"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  id: string;
  section: string;
  sectionColor: string;
  icon: string;
  title: string;
  description: string;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  { id: "welcome", section: "Welcome", sectionColor: "#3b82f6", icon: "👋", title: "Welcome to your CRM!", description: "This quick tour walks you through every section of the system. No experience needed. Learn what each part is for and what you would actually do there. It takes about 2 minutes.", tip: "Press Escape at any time to close this tour, or come back to it later from the Help button in the sidebar." },
  { id: "control-tower", section: "Intelligence", sectionColor: "#6366f1", icon: "🗼", title: "Control Tower", description: "Think of this as your mission control. Type in any order number and instantly see where it is — confirmed? In production? Shipped? Every stage of that order appears in one place, so you never have to dig through multiple screens to answer a customer question.", tip: "Great for answering 'Where is my order?' in under 10 seconds." },
  { id: "reports", section: "Intelligence", sectionColor: "#6366f1", icon: "📊", title: "Reports Portal", description: "Your numbers dashboard. See the big picture: how many orders came in this month, total value dispatched, which items are most commonly ordered, and how the business is trending. Export anything to a spreadsheet.", tip: "Use the date-range filter to compare this month to last month." },
  { id: "feedbacks", section: "Intelligence", sectionColor: "#6366f1", icon: "⭐", title: "Customer Feedback", description: "After dispatching to a customer, log their reaction here — did they love it, were there complaints, did they ask for fixes? Every piece of feedback is tied to the original order so you can always trace what happened.", tip: "Low ratings are automatically flagged so nothing falls through the cracks." },
  { id: "enquiries", section: "Sales & Orders", sectionColor: "#10b981", icon: "💬", title: "Enquiries", description: "The very first step. When a customer asks if you can make something for them — log it here. Record what they want, how many, when they need it, and who they are. An enquiry is not a commitment yet — just a record that someone asked.", tip: "Every order starts as an enquiry. Nothing gets lost because everything is captured here from day one." },
  { id: "quotations", section: "Sales & Orders", sectionColor: "#10b981", icon: "📋", title: "Quotations", description: "Once you know what the customer wants, price it here and send a formal quote. Create multiple versions — maybe the first one gets rejected and you revise it. The system keeps all versions so you have a clear history of what was offered and when.", tip: "Only the latest approved quote becomes an order — earlier drafts are saved but do not affect anything." },
  { id: "sales-orders", section: "Sales & Orders", sectionColor: "#10b981", icon: "📦", title: "Sales Orders", description: "Once the customer says yes, a Sales Order is created — the official commitment. It lists exactly what needs to be made, how many, and what was agreed. From here, the rest of the system — production, QC, shipping — all works off this order.", tip: "See at a glance how much has been dispatched vs. how much is still outstanding for each line item." },
  { id: "material-requirements", section: "Procurement", sectionColor: "#f59e0b", icon: "📝", title: "Material Requirements", description: "Before production starts, someone figures out what raw materials are needed. Document that here — for this sales order, we need X kg of steel, Y litres of paint. These requirements then flow into the purchasing process." },
  { id: "purchase-rfqs", section: "Procurement", sectionColor: "#f59e0b", icon: "🤝", title: "Purchase RFQs", description: "RFQ stands for Request for Quotation. When you know what materials you need, ask suppliers for their prices. Send the request to multiple suppliers and compare responses so you can choose the best deal.", tip: "Request quotes from several suppliers at once and compare them side by side." },
  { id: "purchase-orders", section: "Procurement", sectionColor: "#f59e0b", icon: "🛒", title: "Purchase Orders", description: "Once you pick a supplier and agree on a price, raise a Purchase Order here — the official instruction to deliver materials. The system tracks what was ordered and what has arrived, so you always know if you are waiting on something." },
  { id: "plannings", section: "Execution & Planning", sectionColor: "#8b5cf6", icon: "📅", title: "Planning", description: "Your production schedule. Once materials are secured, plan when and how things get made. Assign sales orders to production slots, set target dates, and make sure the floor knows what to work on and in what order.", tip: "The planning screen connects directly to job cards — when you plan a batch, work instructions are ready for the floor." },
  { id: "job-cards", section: "Execution & Planning", sectionColor: "#8b5cf6", icon: "🔧", title: "In-House Job Cards", description: "A Job Card is the instruction sheet for your production team. It tells them what needs to be made, how many, and when. Workers record progress — how much is completed, what passed quality checks, and any issues.", tip: "Each job card links to a specific sales order line, so production and sales always stay in sync." },
  { id: "jobwork-rfqs", section: "Execution & Planning", sectionColor: "#8b5cf6", icon: "📤", title: "Job Work RFQs", description: "Sometimes you do not make something yourself — you send it to an outside contractor. Before you do, ask them for their price. Describe the work and get quotes from job-work vendors so you can pick the right one." },
  { id: "service-orders", section: "Execution & Planning", sectionColor: "#8b5cf6", icon: "💼", title: "Service Orders", description: "Once you select a job-work vendor and agree on a price, raise a Service Order — the formal instruction to the outside contractor. It records what was asked, at what price, and tracks when the work comes back." },
  { id: "rgp-challans", section: "Execution & Planning", sectionColor: "#8b5cf6", icon: "🔄", title: "RGP Challans", description: "RGP stands for Returnable Gate Pass. When you send materials to an outside vendor for processing, you need a paper trail saying this left our premises and is expected back. RGP Challans are that record — they track what went out and when it came back." },
  { id: "qc-inspections", section: "Quality & Inspection", sectionColor: "#ef4444", icon: "✅", title: "QC Worklist", description: "Before anything ships to a customer, it has to pass a quality check. The QC Worklist shows everything ready to be inspected. Open a batch, record whether it passed or failed, note observations, and decide if it is good to go or needs fixing.", tip: "Nothing can be dispatched without a QC pass — the system enforces this automatically." },
  { id: "qc-actions", section: "Quality & Inspection", sectionColor: "#ef4444", icon: "⚠️", title: "QC Action Tracker", description: "When something fails inspection, someone needs to decide what to do: fix it, scrap it, or send it back. The Action Tracker is where those decisions are made and recorded. See every open quality issue and its current status." },
  { id: "dispatches", section: "Fulfillment & Dispatch", sectionColor: "#06b6d4", icon: "🚚", title: "Delivery Challans", description: "Once goods pass quality checks, ship them here. A Delivery Challan is the document that goes with the goods — what was sent, how many, and to whom. The system automatically updates the sales order to show how much has been delivered.", tip: "You can dispatch partial quantities — ship 50 of an order for 100 now and come back later for the rest." },
  { id: "customers", section: "Masters", sectionColor: "#64748b", icon: "👥", title: "Customers", description: "Your customer address book. Every company you do business with lives here — name, contact details, and history. When you create an enquiry or sales order, pick the customer from this list. You only need to enter their details once." },
  { id: "items", section: "Masters", sectionColor: "#64748b", icon: "🏷️", title: "Items (Products)", description: "The catalogue of things you sell. Every product you make or supply is defined here with a name, unit of measure, and key details. When filling in an order or quote, pick from this list rather than typing the product name each time." },
  { id: "materials", section: "Masters", sectionColor: "#64748b", icon: "⚙️", title: "Materials Master", description: "Similar to Items, but for the raw materials and components you buy — not the finished goods you sell. Steel rods, paint, fittings, consumables all live here. When creating material requirements, pick from this list." },
  { id: "suppliers", section: "Masters", sectionColor: "#64748b", icon: "🏭", title: "Suppliers", description: "Your supplier directory. Every vendor you buy from — raw material suppliers, job-work contractors, service providers — is registered here. Contact details, payment terms, and past orders are all in one place." },
  { id: "users", section: "Admin", sectionColor: "#94a3b8", icon: "👤", title: "Users", description: "Where the administrator manages who can log in. Add new team members, deactivate users who have left, and see who is currently active. Each user gets assigned a role that controls what they can see and do." },
  { id: "roles", section: "Admin", sectionColor: "#94a3b8", icon: "🔑", title: "Roles & Permissions", description: "Roles control access. A Sales person can see enquiries and orders but cannot change master data or approve dispatches. A Production person can update job cards but not see pricing. You define those rules here.", tip: "The system comes with a few ready-made roles. You can also create custom ones for your team." },
  { id: "audit-logs", section: "Admin", sectionColor: "#94a3b8", icon: "📜", title: "Audit Trail", description: "Every important action in the system is automatically logged here — who did what, and when. If an order gets changed or something unexpected happens, the audit trail tells the full story. Your security net and compliance record all in one." },
  { id: "done", section: "All done!", sectionColor: "#3b82f6", icon: "🎉", title: "You are ready to go!", description: "That is the whole system — from the moment a customer asks for something, all the way through to shipping it and logging their feedback. Everything connects, so nothing slips through the cracks.", tip: "Start by adding your first customer and item in the Masters section. Then log an enquiry and follow it all the way through!" },
];

const STORAGE_SEEN_KEY = "crm_tour_seen";

function ProgressDots({ total, current, onJump }: { total: number; current: number; onJump: (idx: number) => void }) {
  const MAX_VISIBLE = 9;
  const windowStart = Math.max(0, Math.min(current - Math.floor(MAX_VISIBLE / 2), total - MAX_VISIBLE));
  const windowEnd = Math.min(total, windowStart + MAX_VISIBLE);
  return (
    <div className="tour-progress-dots">
      {windowStart > 0 && <span className="tour-dot-ellipsis">...</span>}
      {Array.from({ length: windowEnd - windowStart }, (_, i) => windowStart + i).map((idx) => (
        <button key={idx} type="button" className={`tour-dot ${idx === current ? "active" : ""}`} onClick={() => onJump(idx)} aria-label={`Go to step ${idx + 1}`} />
      ))}
      {windowEnd < total && <span className="tour-dot-ellipsis">...</span>}
    </div>
  );
}

interface ProductTourProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function ProductTour({ forceOpen = false, onClose }: ProductTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (forceOpen) { setIsOpen(true); return; }
    const seen = localStorage.getItem(STORAGE_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  function closeTour() {
    setIsOpen(false);
    localStorage.setItem(STORAGE_SEEN_KEY, "true");
    onClose?.();
  }

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (currentStep === totalSteps - 1) { closeTour(); return; }
    setDirection("next");
    setIsAnimating(true);
    setTimeout(() => { setCurrentStep(s => s + 1); setIsAnimating(false); }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (isAnimating || currentStep === 0) return;
    setDirection("prev");
    setIsAnimating(true);
    setTimeout(() => { setCurrentStep(s => s - 1); setIsAnimating(false); }, 200);
  }, [isAnimating, currentStep]);

  function jumpTo(idx: number) {
    if (isAnimating || idx === currentStep) return;
    setDirection(idx > currentStep ? "next" : "prev");
    setIsAnimating(true);
    setTimeout(() => { setCurrentStep(idx); setIsAnimating(false); }, 200);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") closeTour();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, goNext, goPrev]);

  if (!isOpen) return null;

  const isLast = currentStep === totalSteps - 1;
  const progressPct = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      <div className="tour-backdrop" onClick={closeTour} />
      <div
        className={`tour-card ${isAnimating ? `tour-anim-out-${direction}` : "tour-anim-in"}`}
        role="dialog"
        aria-modal="true"
        aria-label="CRM product tour"
      >
        <div className="tour-header">
          <div className="tour-header-left">
            <span className="tour-section-badge" style={{ background: step.sectionColor + "22", color: step.sectionColor, borderColor: step.sectionColor + "55" }}>
              {step.section}
            </span>
            <span className="tour-step-count">{currentStep + 1} of {totalSteps}</span>
          </div>
          <button type="button" className="tour-close-btn" onClick={closeTour} aria-label="Close tour" title="Close (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="tour-progress-bar-track">
          <div className="tour-progress-bar-fill" style={{ width: `${progressPct}%`, background: step.sectionColor }} />
        </div>
        <div className="tour-body">
          <div className="tour-icon-wrap" style={{ background: step.sectionColor + "18", borderColor: step.sectionColor + "33" }}>
            <span className="tour-icon">{step.icon}</span>
          </div>
          <div className="tour-text">
            <h2 className="tour-title">{step.title}</h2>
            <p className="tour-description">{step.description}</p>
            {step.tip && (
              <div className="tour-tip">
                <span className="tour-tip-icon">&#x1F4A1;</span>
                <span className="tour-tip-text">{step.tip}</span>
              </div>
            )}
          </div>
        </div>
        <ProgressDots total={totalSteps} current={currentStep} onJump={jumpTo} />
        <div className="tour-footer">
          <button type="button" className="tour-btn-secondary" onClick={goPrev} disabled={currentStep === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button type="button" className="tour-btn-primary" onClick={goNext} style={{ background: step.sectionColor, borderColor: step.sectionColor }}>
            {isLast ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Finish Tour</>
            ) : (
              <>Next<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></>
            )}
          </button>
        </div>
        <p className="tour-keyboard-hint">
          <kbd>&#x2190;</kbd> <kbd>&#x2192;</kbd> to navigate &nbsp;&middot;&nbsp; <kbd>Esc</kbd> to close
        </p>
      </div>
    </>
  );
}

export function TourTriggerButton() {
  const [showTour, setShowTour] = useState(false);
  return (
    <>
      <button id="tour-trigger-btn" type="button" className="tour-trigger-btn" onClick={() => setShowTour(true)} title="Take a guided tour of the CRM">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Take a Tour
      </button>
      {showTour && <ProductTour forceOpen={true} onClose={() => setShowTour(false)} />}
    </>
  );
}