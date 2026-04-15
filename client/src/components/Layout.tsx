import Navbar from "./Navbar";
import SponsorBanner from "./SponsorBanner";
import Footer from "./Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 mt-14 relative z-10">
        {children}
      </main>
      <SponsorBanner />
      <Footer />
    </div>
  );
}
