"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { TourTriggerButton } from "./ProductTour";

interface NavItem {
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// Crisp 16x16 SVG Icons
const Icons = {
  Radar: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M12 10a2 2 0 1 0 2 2" />
      <line x1="12" y1="12" x2="21.5" y2="2.5" />
    </svg>
  ),
  Chart: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Star: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Enquiry: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Quote: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Order: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  ClipboardCheck: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  AlertCircle: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Truck: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Calendar: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Tool: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Send: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Briefcase: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Share: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  ),
  Boxes: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  FileText: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  ShoppingCart: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Users: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Layers: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Package: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Building: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="22.01" />
      <line x1="15" y1="22" x2="15" y2="22.01" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  ),
  Shield: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Key: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  List: (active: boolean) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

const SECTIONS: NavSection[] = [
  {
    id: "intelligence",
    title: "Intelligence",
    items: [
      { label: "Control Tower", href: "/control-tower", icon: Icons.Radar },
      { label: "Reports Portal", href: "/reports", icon: Icons.Chart },
      { label: "Customer Feedback", href: "/feedbacks", icon: Icons.Star },
    ],
  },
  {
    id: "sales",
    title: "Sales & Orders",
    items: [
      { label: "Enquiries", href: "/enquiries", icon: Icons.Enquiry },
      { label: "Quotations", href: "/quotations", icon: Icons.Quote },
      { label: "Sales Orders", href: "/sales-orders", icon: Icons.Order },
    ],
  },
  {
    id: "quality",
    title: "Quality & Inspection",
    items: [
      { label: "QC Worklist", href: "/qc-inspections", icon: Icons.ClipboardCheck },
      { label: "QC Action Tracker", href: "/qc-actions", icon: Icons.AlertCircle },
    ],
  },
  {
    id: "fulfillment",
    title: "Fulfillment & Dispatch",
    items: [
      { label: "Delivery Challans", href: "/dispatches", icon: Icons.Truck },
    ],
  },
  {
    id: "execution",
    title: "Execution & Planning",
    items: [
      { label: "Planning", href: "/plannings", icon: Icons.Calendar },
      { label: "Job Cards (In-house)", href: "/job-cards", icon: Icons.Tool },
      { label: "Job Work RFQs", href: "/jobwork-rfqs", icon: Icons.Send },
      { label: "Service Orders", href: "/service-orders", icon: Icons.Briefcase },
      { label: "RGP Challans", href: "/rgp-challans", icon: Icons.Share },
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    items: [
      { label: "Material Reqs", href: "/material-requirements", icon: Icons.Boxes },
      { label: "Purchase RFQs", href: "/purchase-rfqs", icon: Icons.FileText },
      { label: "Purchase Orders", href: "/purchase-orders", icon: Icons.ShoppingCart },
    ],
  },
  {
    id: "masters",
    title: "Masters",
    items: [
      { label: "Customers", href: "/customers", icon: Icons.Users },
      { label: "Items", href: "/items", icon: Icons.Layers },
      { label: "Materials Master", href: "/materials", icon: Icons.Package },
      { label: "Suppliers", href: "/suppliers", icon: Icons.Building },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: Icons.Users },
      { label: "Roles & Permissions", href: "/admin/roles", icon: Icons.Key },
      { label: "Audit Trail", href: "/admin/audit-logs", icon: Icons.List },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();

  // Find active section ID based on current pathname
  const activeSectionId = SECTIONS.find((sec) =>
    sec.items.some((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
  )?.id;

  // Persist collapsed state
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() => {
    // Default all collapsed except active
    const initial: Record<string, boolean> = {};
    SECTIONS.forEach((sec) => {
      initial[sec.id] = sec.id !== (activeSectionId || "sales");
    });
    return initial;
  });

  // Auto-expand section when route changes if not already expanded
  useEffect(() => {
    if (activeSectionId) {
      setCollapsedState((prev) => ({
        ...prev,
        [activeSectionId]: false,
      }));
    }
  }, [activeSectionId]);

  const toggleSection = (id: string) => {
    setCollapsedState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <Link href="/control-tower" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="brand-badge">CRM</span>
          <span className="brand-title">Core Engine</span>
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="sidebar-nav-container">
        {SECTIONS.map((section, idx) => {
          const isCollapsed = !!collapsedState[section.id];
          const hasActiveChild = section.items.some(
            (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          );

          return (
            <div key={section.id} className="nav-section-group">
              {idx > 0 && <div className="nav-section-divider" />}

              {/* Group Header Row */}
              <button
                type="button"
                className={`nav-section-header ${hasActiveChild ? "has-active-child" : ""}`}
                onClick={() => toggleSection(section.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="nav-section-title">{section.title}</span>
                <svg
                  className={`nav-section-chevron ${isCollapsed ? "collapsed" : "expanded"}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Group Children Links */}
              {!isCollapsed && (
                <div className="nav-section-children">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item-link ${isActive ? "active" : ""}`}
                      >
                        <span className={`nav-item-icon ${isActive ? "active" : ""}`}>
                          {item.icon(isActive)}
                        </span>
                        <span className="nav-item-text">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / Theme Toggle + Tour */}
      <div className="sidebar-footer" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="footer-label">Theme</span>
          <ThemeToggle />
        </div>
        <TourTriggerButton />
      </div>
    </aside>
  );
}
