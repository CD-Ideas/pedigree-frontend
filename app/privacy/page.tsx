import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-6" style={{ fontFamily: "var(--font-table)", fontSize: "12px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          &larr; Back to Home
        </Link>
        <h1 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "2rem" }} className="text-white mb-6">Privacy Policy</h1>
        <div style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8 }} className="space-y-5">
          <p><strong style={{ color: "#fff" }}>Last updated:</strong> March 14, 2026</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>1. Information We Collect</h2>
          <p>We collect information you provide directly: username, email address, and dog pedigree data you enter. We do not collect real names unless you choose to provide one.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>2. How We Use Your Information</h2>
          <p>Your information is used to provide the Pedigree Platform service, including generating pedigree trees, bloodline analysis, and facilitating marketplace transactions. We never sell your personal data to third parties.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure password hashing, and regular security audits.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>4. Cookies</h2>
          <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>5. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at support@pedigreeplatform.com.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>6. Changes to This Policy</h2>
          <p>We may update this policy from time to time. Changes will be posted on this page with an updated revision date.</p>
        </div>
      </div>
    </div>
  );
}
