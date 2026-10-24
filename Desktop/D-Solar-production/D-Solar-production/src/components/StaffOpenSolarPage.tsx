type StaffOpenSolarPageProps = {
  staffName: string;
  formUrl?: string;
  pageLabel?: string;
};

const OPEN_SOLAR_PAGE_URL =
  'https://spoke.opensolar.com/?uuid=e98fc873-018d-48db-b42b-8989bb914fae';

export default function StaffOpenSolarPage({
  staffName,
  formUrl = OPEN_SOLAR_PAGE_URL,
  pageLabel = 'AI Info',
}: StaffOpenSolarPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 px-4 md:pt-36">
      <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-100 p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">{pageLabel} - {staffName}</h1>
        <p className="text-gray-700 mb-8">
          Please complete the form below so the D-Solar team can assist you with your solar analysis.
        </p>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          {/* Direct iframe embed is used for faster and more reliable preview rendering. */}
          <iframe
            title={`OpenSolar form for ${staffName}`}
            src={formUrl}
            className="w-full min-h-[760px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <p className="text-xs text-gray-500 mt-6 mb-3">
          If the form takes too long to load, open it directly in a new tab:
        </p>
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-blue-700 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-800 transition-colors"
        >
          Open OpenSolar Form
        </a>
        <p className="text-xs text-gray-500 mt-3">
          Direct link:{' '}
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-900 underline"
          >
            {formUrl}
          </a>
        </p>
      </section>
    </main>
  );
}
