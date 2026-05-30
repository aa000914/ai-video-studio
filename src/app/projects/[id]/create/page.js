"use client";

import { useParams } from "next/navigation";
import CreationTimeline from "@/components/CreationTimeline";
import CreationDocument from "@/components/CreationDocument";

export default function CreateSessionPage() {
  const params = useParams();
  const projectId = params.id;

  return (
    <div className="h-full flex" style={{ background: "#0a0f1e" }}>
      {/* Left: AI Timeline */}
      <div className="w-[38%] border-r border-white/5">
        <CreationTimeline />
      </div>

      {/* Right: Document */}
      <div className="w-[62%]">
        <CreationDocument projectId={projectId} />
      </div>
    </div>
  );
}
