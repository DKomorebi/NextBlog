import { Suspense } from "react";
import { Editor } from "@/components/full-blog";
export default function Page() {
  return (
    <Suspense fallback={<p>正在打开编辑器…</p>}>
      <Editor />
    </Suspense>
  );
}
