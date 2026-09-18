import type { Metadata } from "next";
import "./globals.css";
import SidebarNav from "../components/SidebarNav";
import ProductTour from "../components/ProductTour";

export const metadata: Metadata = {
  title: "CRM Core | Antigravity",
  description: "Sales Order & Fulfillment Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <SidebarNav />
          <main className="main-content">
            {children}
          </main>
          <ProductTour />
        </div>
      </body>
    </html>
  );
}
