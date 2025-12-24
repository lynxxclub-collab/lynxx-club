import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border text-muted-foreground py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company */}
          <div>
            <h3 className="text-foreground font-bold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-foreground font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
              <li><Link to="/guidelines" className="hover:text-foreground transition-colors">Community Guidelines</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-foreground font-bold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/safety" className="hover:text-foreground transition-colors">Safety Tips</Link></li>
              <li><Link to="/report" className="hover:text-foreground transition-colors">Report a Problem</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-foreground font-bold mb-4">Follow Us</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-foreground transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">TikTok</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm">
          <p>&copy; 2025 Lynxx Club. All rights reserved.</p>
          <p className="mt-2">18+ Only. Not an escort service.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
