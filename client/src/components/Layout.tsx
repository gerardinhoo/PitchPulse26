import Navbar from "./Navbar";
import SponsorBanner from "./SponsorBanner";
import Footer from "./Footer";
import VerificationBanner from "./VerificationBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <VerificationBanner />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 mt-14 relative z-10"
      >
        {children}
      </main>
      <SponsorBanner />
      <Footer />
    </div>
  );
}
