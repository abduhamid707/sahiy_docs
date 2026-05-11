import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-gray-100 p-6">
        <FileQuestion className="h-12 w-12 text-gray-400" />
      </div>
      <h1 className="mb-2 text-3xl font-extrabold text-gray-900">Page Not Found</h1>
      <p className="mb-8 max-w-md text-gray-600">
        The documentation page or project you're looking for doesn't exist or you don't have permission to view it.
      </p>
      <Link 
        href="/" 
        className={cn(buttonVariants({ variant: "default" }), "gap-2")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
