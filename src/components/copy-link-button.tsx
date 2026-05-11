"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Link } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="h-4 w-4 mr-1 text-green-400" />
      ) : (
        <Link className="h-4 w-4 mr-1" />
      )}
      {copied ? "Copied!" : "Copy invite link"}
    </Button>
  );
}
