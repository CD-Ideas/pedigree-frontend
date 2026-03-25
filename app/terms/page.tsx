export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "2rem" }} className="text-white mb-6">Terms of Service</h1>
        <div style={{ fontFamily: "var(--font-table)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.8 }} className="space-y-5">
          <p><strong style={{ color: "#fff" }}>Last updated:</strong> March 14, 2026</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>1. Acceptance of Terms</h2>
          <p>By accessing or using Pedigree Platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>2. Account Registration</h2>
          <p>You must create an account to access most features. You are responsible for maintaining the confidentiality of your account credentials. You may use a username of your choice; real names are not required.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>3. Acceptable Use</h2>
          <p>You agree to use the platform only for lawful purposes related to dog pedigree management, breeding records, and related activities. You must not upload false pedigree information or misrepresent dog lineage.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>4. Marketplace</h2>
          <p>Pedigree Platform facilitates connections between buyers and sellers but is not a party to any transaction. All marketplace listings must be accurate and comply with local laws regarding animal sales.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>5. Intellectual Property</h2>
          <p>You retain ownership of the pedigree data you submit. By using the platform, you grant us a license to display and process your data as needed to provide the service.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>6. Subscription & Billing</h2>
          <p>Premium features require a paid subscription at $9.99/month. You may cancel at any time. Refunds are handled on a case-by-case basis.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>7. Limitation of Liability</h2>
          <p>Pedigree Platform is provided &ldquo;as is&rdquo; without warranty. We are not liable for any decisions made based on pedigree data, bloodline analysis, or breeding recommendations provided by the platform.</p>

          <h2 style={{ fontFamily: "var(--font-table)", fontWeight: 600, fontSize: "1.1rem", color: "var(--accent-gold)" }}>8. Contact</h2>
          <p>For questions about these terms, <a href="/contact" style={{ color: "var(--accent-gold)", textDecoration: "underline" }}>contact us here</a>.</p>
        </div>
      </div>
    </div>
  );
}
