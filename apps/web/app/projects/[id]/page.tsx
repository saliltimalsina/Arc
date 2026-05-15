"use client";

import { use } from "react";
import ProjectsClient from "./ProjectsClient";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectsClient slug={id} />;
}
