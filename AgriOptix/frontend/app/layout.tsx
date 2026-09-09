import "./globals.css";
import { WorkflowProvider } from "../lib/store";

export const metadata = { title: "AgriOptix", description: "AI-powered farm-to-market optimization" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkflowProvider>{children}</WorkflowProvider>
      </body>
    </html>
  );
}
