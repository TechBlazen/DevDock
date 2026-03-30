import { Shield } from 'lucide-react';

export const PrivacyPage = () => {
  const updated = 'March 29, 2026';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div className="flex items-center gap-3 mb-2">
        <Shield size={24} style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
      </div>
      <p className="text-[12px] mb-8" style={{ color: 'var(--text-muted)' }}>Last updated: {updated}</p>

      <div className="flex flex-col gap-6">
        <Section title="1. Introduction">
          DevDock ("we", "our", or "the application") is an AI-powered developer portal.
          This Privacy Policy explains how we collect, use, and protect information when you use our application.
          We are committed to protecting your privacy and handling your data transparently.
        </Section>

        <Section title="2. Information We Collect">
          <strong>Account Information:</strong> When you create an account or sign in, we collect your
          display name, email address, and authentication provider. For local accounts, passwords are
          hashed before storage.
          <br /><br />
          <strong>Usage Data:</strong> We collect information about how you interact with the application,
          including dashboard preferences, widget layouts, theme settings, and feature usage patterns.
          <br /><br />
          <strong>API Keys:</strong> API keys you provide for AI providers (Anthropic, OpenAI, Google, etc.)
          and source control platforms (GitHub, Azure DevOps) are stored locally in your browser and are
          never transmitted to our servers.
        </Section>

        <Section title="3. How We Store Your Data">
          All user data, preferences, and settings are stored locally in your browser using localStorage.
          No personal data is transmitted to external servers unless you explicitly configure third-party
          integrations (e.g., GitHub API, Azure DevOps API, AI provider APIs). When OpenTelemetry is enabled,
          trace and metric data is sent to the OTLP endpoint you configure.
        </Section>

        <Section title="4. Third-Party Services">
          DevDock integrates with third-party services at your direction. These services have their
          own privacy policies:
          <ul style={{ marginTop: 8, paddingLeft: 20, listStyleType: 'disc' }}>
            <li>GitHub (github.com)</li>
            <li>Microsoft Azure DevOps (dev.azure.com)</li>
            <li>Anthropic Claude API (anthropic.com)</li>
            <li>OpenAI API (openai.com)</li>
            <li>Google Gemini API (ai.google.dev)</li>
          </ul>
          We only connect to these services when you provide credentials and initiate requests.
        </Section>

        <Section title="5. Data Security">
          We implement appropriate technical measures to protect your information. All data is stored
          locally in your browser. Authentication tokens are stored in browser storage and are accessible
          only within the application context. We do not use cookies for tracking purposes.
        </Section>

        <Section title="6. Your Rights">
          You have the right to access, correct, or delete your personal data at any time. You can
          clear all stored data by clearing your browser's localStorage for this application, or by
          using the sign-out functionality which removes your session data. You can manage your preferences
          through the Profile page.
        </Section>

        <Section title="7. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of any significant
          changes by updating the "Last updated" date at the top of this page. Continued use of the
          application after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="8. Contact">
          If you have questions about this Privacy Policy or our data practices, please reach out
          through the application's support channels or open an issue on our GitHub repository.
        </Section>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <h2 className="text-[14px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  );
}
