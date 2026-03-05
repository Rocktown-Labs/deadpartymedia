interface PageTitleHeaderProps {
  description?: string;
  title: string;
}

export function PageTitleHeader({ description, title }: PageTitleHeaderProps) {
  return (
    <div className="mb-12">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-wider">{title}</h1>
        <div className="h-1 w-20 sm:w-32 bg-[#7CFC00]" />
      </div>
      {description ? <p className="text-lg sm:text-xl text-gray-400">{description}</p> : null}
    </div>
  );
}
