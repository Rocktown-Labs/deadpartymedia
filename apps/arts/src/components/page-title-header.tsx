interface PageTitleHeaderProps {
  description?: string;
  eyebrow?: string;
  title: string;
}

export function PageTitleHeader({ description, eyebrow, title }: PageTitleHeaderProps) {
  return (
    <div className="mb-12">
      {eyebrow ? (
        <p className="mb-4 font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
          {eyebrow}
        </p>
      ) : null}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-8">
        <h1 className="font-black text-4xl tracking-wider sm:text-5xl">{title}</h1>
        <div className="h-1 w-20 bg-[#7CFC00] sm:w-32" />
      </div>
      {description ? (
        <p className="max-w-3xl text-gray-400 text-lg sm:text-xl">{description}</p>
      ) : null}
    </div>
  );
}
