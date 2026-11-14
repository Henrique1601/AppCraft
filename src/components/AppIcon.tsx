"use client";

import { useState } from "react";
import { getInitialsStyle, resolveAppIconUrl } from "@/lib/icons";

interface AppIconProps {
  name: string;
  iconUrl?: string;
  websiteUrl?: string;
  repoUrl?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[11px] rounded-md",
  md: "h-10 w-10 text-xs rounded-xl",
  lg: "h-12 w-12 text-sm rounded-xl",
};

export function AppIcon({
  name,
  iconUrl,
  websiteUrl,
  repoUrl,
  size = "md",
}: AppIconProps) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveAppIconUrl({ iconUrl, websiteUrl, repoUrl });
  const { initials, gradientClass } = getInitialsStyle(name);

  if (!resolvedUrl || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center border bg-gradient-to-br font-semibold tracking-tight ${gradientClass} ${SIZE_CLASSES[size]}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-zinc-800 bg-zinc-900/90 p-1.5 ${SIZE_CLASSES[size]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedUrl}
        alt={`Ícone ${name}`}
        className="h-full w-full object-contain rounded-sm"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
