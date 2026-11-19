import { Suspense } from "react";
import { Editor } from "@/components/full-blog";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p>正在打开编辑器…</p>}>
      <Editor id={(await params).id} />
    </Suspense>
  );
}
