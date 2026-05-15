"use client";

import { use } from "react";
import ProjectsClient from "../ProjectsClient";

export default function Page({ params }: { params: Promise<{ id: string; issue: string }> }) {
  const { id, issue } = use(params);
  return <ProjectsClient slug={id} issueRef={issue} />;
}
