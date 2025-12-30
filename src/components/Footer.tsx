import { Link } from "react-router-dom";
import { Heart, Instagram, Twitter, Music2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative bg-[#0a0a0f] border-t border-white/5 text-white/50 py-12 px-4">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="relative">
                <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20" />
                <div className="absolute inset-0 blur-md bg-rose-400/30" />
              </div>
              <span
                className="text-lg font-bold bg-gradient-to-r from-white via-rose-200 to-purple-200 bg-clip-text text-transparent"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Lynxx Club
              </span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Where real connections begin. Premium dating for those who value quality.
            </p>
          </div>

          {/* Company */}
          <div>
            <h2
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Company
            </h2>
            <ul className="space-y-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <li>
                <Link to="/about" className="text-sm hover:text-rose-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/launch" className="text-sm hover:text-rose-400 transition-colors">
                  Launch Progress
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm hover:text-rose-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-sm hover:text-rose-400 transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Legal
            </h2>
            <ul className="space-y-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <li>
                <Link to="/terms" className="text-sm hover:text-rose-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm hover:text-rose-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm hover:text-rose-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/guidelines" className="text-sm hover:text-rose-400 transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h2
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Support
            </h2>
            <ul className="space-y-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <li>
                <Link to="/help" className="text-sm hover:text-rose-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq/pricing" className="text-sm hover:text-rose-400 transition-colors">
                  Pricing FAQ
                </Link>
              </li>
              <li>
                <Link to="/safety" className="text-sm hover:text-rose-400 transition-colors">
                  Safety Tips
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-sm hover:text-rose-400 transition-colors">
                  Report a Problem
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h2
              className="text-white font-semibold mb-4 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Follow Us
            </h2>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Follow us on Instagram"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
              >
                <Instagram className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Instagram</span>
              </a>
              <a
                href="#"
                aria-label="Follow us on Twitter"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
              >
                <Twitter className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Twitter</span>
              </a>
              <a
                href="#"
                aria-label="Follow us on TikTok"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
              >
                <Music2 className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">TikTok</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            &copy; 2025 Lynxx Club. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span
              className="text-xs text-white/30 px-3 py-1 rounded-full bg-white/5 border border-white/10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              18+ Only
            </span>
            <span className="text-xs text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Not an escort service
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
