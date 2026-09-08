import React from "react";

type Props = {
  images: string[];
  className?: string;
};

export default function ThreadImages({ images, className = "" }: Props) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const maxShow = 4;
  const show = images.slice(0, maxShow);
  const extra = images.length - show.length;

  const Tile = ({
    src,
    alt,
    children,
  }: {
    src: string;
    alt: string;
    children?: React.ReactNode;
  }) => (
    <div
      className="relative h-full w-full overflow-hidden bg-zinc-900"
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {children}
    </div>
  );

  // Frame responsif: tinggi mengikuti lebar (stabil)
  const Frame = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`mt-3 relative overflow-hidden rounded-2xl border border-zinc-800 aspect-[16/9] sm:aspect-[2/1] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );

  // 1
  if (images.length === 1) {
    return (
      <Frame>
        <Tile src={images[0]} alt="img-0" />
      </Frame>
    );
  }

  // 2 (flex split biar stabil)
  if (images.length === 2) {
    return (
      <Frame>
        <div className="flex h-full w-full gap-[1px] bg-zinc-800">
          <div className="h-full w-1/2 bg-black">
            <Tile src={images[0]} alt="img-0" />
          </div>
          <div className="h-full w-1/2 bg-black">
            <Tile src={images[1]} alt="img-1" />
          </div>
        </div>
      </Frame>
    );
  }

  // 3 (INI yang kamu mau: kiri besar, kanan 2 stack)
  if (images.length === 3) {
    return (
      <Frame>
        <div className="flex h-full w-full gap-[1px] bg-zinc-800">
          {/* kiri besar */}
          <div className="h-full w-1/2 bg-black">
            <Tile src={images[0]} alt="img-0" />
          </div>

          {/* kanan 2 stack */}
          <div className="flex h-full w-1/2 flex-col gap-[1px] bg-zinc-800">
            <div className="h-1/2 bg-black">
              <Tile src={images[1]} alt="img-1" />
            </div>
            <div className="h-1/2 bg-black">
              <Tile src={images[2]} alt="img-2" />
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  // 4+ (2x2 + overlay)
  return (
    <Frame>
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[1px] bg-zinc-800">
        {show.map((src, i) => {
          const isLast = i === 3 && extra > 0;

          return (
            <div key={`${src}-${i}`} className="bg-black">
              <Tile src={src} alt={`img-${i}`}>
                {isLast && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-3xl font-semibold text-white">+{extra}</span>
                  </div>
                )}
              </Tile>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
