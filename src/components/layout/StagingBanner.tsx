export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "staging") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1.5 tracking-wide">
      STAGING — changes here do not affect production
    </div>
  );
}
