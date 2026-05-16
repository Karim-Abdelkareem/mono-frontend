export default function OrderDetailsSkeleton() {
  return (
    <div className="w-full animate-pulse px-4 py-6 md:px-8">
      <div className="mb-6 h-4 w-32 rounded bg-gray-200" />
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-48 rounded-lg bg-gray-200" />
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-full bg-gray-200" />
              <div className="h-7 w-16 rounded-full bg-gray-200" />
              <div className="h-7 w-24 rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="h-10 w-28 rounded-lg bg-gray-200" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-64 rounded-2xl border border-gray-200 bg-white" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-40 rounded-2xl border border-gray-200 bg-white" />
            <div className="h-40 rounded-2xl border border-gray-200 bg-white" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-56 rounded-2xl border border-gray-200 bg-white" />
          <div className="h-80 rounded-2xl border border-gray-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
